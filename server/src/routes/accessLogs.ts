import { Router } from 'express'
import { config } from '../config.js'
import { pool } from '../db.js'
import { toCsv } from '../lib/csv.js'
import { asyncHandler } from '../lib/http.js'
import { isoDate, likePattern, optOneOf, orderBy, paging, queryText } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireRole('admin', 'control_acceso'))

const FROM = `
  from access_logs l
  join employees e on e.id = l.employee_id
  join access_points p on p.id = l.access_point_id`

const SORT_COLUMNS: Record<string, string> = {
  name: 'e.full_name',
  document: 'e.document',
  movement: 'l.movement',
  occurredAt: 'l.occurred_at',
  result: 'l.result',
  point: 'p.name',
}

const EXPORT_LIMIT = 50_000

export function logWhere(query: Record<string, unknown>, params: unknown[]): string {
  const conds: string[] = []

  const q = queryText(query.q)
  if (q) {
    params.push(likePattern(q))
    const nameParam = `$${params.length}`
    const digits = q.replace(/\D/g, '')
    if (digits.length >= 3) {
      params.push(`%${digits}%`)
      conds.push(`(unaccent(e.full_name) ilike unaccent(${nameParam}::text) or e.document like $${params.length}::text)`)
    } else {
      conds.push(`unaccent(e.full_name) ilike unaccent(${nameParam}::text)`)
    }
  }

  const date = isoDate(query.date)
  if (date) {
    params.push(config.timeZone, date)
    conds.push(`(l.occurred_at at time zone $${params.length - 1}::text)::date = $${params.length}::date`)
  }

  const movement = optOneOf(query.movement, 'movement', ['entrada', 'salida'] as const)
  if (movement) {
    params.push(movement)
    conds.push(`l.movement = $${params.length}::movement_type`)
  }

  const result = optOneOf(query.result, 'result', ['autorizado', 'denegado'] as const)
  if (result) {
    params.push(result)
    conds.push(`l.result = $${params.length}::access_result`)
  }

  return conds.length ? `where ${conds.join(' and ')}` : ''
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>
    const { page, pageSize, offset } = paging(query, 10, 100)

    const params: unknown[] = []
    const where = logWhere(query, params)
    const order = orderBy(query, SORT_COLUMNS, 'l.occurred_at desc, l.id desc', 'l.id desc')

    const [rows, count] = await Promise.all([
      pool.query(
        `select l.id::text as id, l.occurred_at as "occurredAt", l.movement, l.result, l.reason,
                p.name as point, e.full_name as "fullName", e.document, e.code
         ${FROM} ${where} ${order}
         limit $${params.length + 1} offset $${params.length + 2}`,
        [...params, pageSize, offset],
      ),
      pool.query(`select count(*)::int as total ${FROM} ${where}`, params),
    ])

    res.json({ data: rows.rows, total: count.rows[0].total, page, pageSize })
  }),
)

router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>
    const params: unknown[] = []
    const where = logWhere(query, params)
    params.push(config.timeZone)
    const tz = `$${params.length}::text`

    const { rows } = await pool.query(
      `select e.full_name, e.document, l.movement, l.result, l.reason, p.name as point,
              to_char(l.occurred_at at time zone ${tz}, 'YYYY-MM-DD') as day,
              to_char(l.occurred_at at time zone ${tz}, 'HH24:MI:SS') as time
       ${FROM} ${where}
       order by l.occurred_at desc, l.id desc
       limit ${EXPORT_LIMIT}`,
      params,
    )

    const csv = toCsv([
      ['Empleado', 'Identificación', 'Tipo', 'Fecha', 'Hora', 'Estado', 'Motivo', 'Punto de acceso'],
      ...rows.map((r: Record<string, string | null>) => [
        r.full_name,
        r.document,
        r.movement === 'entrada' ? 'Entrada' : 'Salida',
        r.day,
        r.time,
        r.result === 'autorizado' ? 'Autorizado' : 'Denegado',
        r.reason,
        r.point,
      ]),
    ])

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="historial-accesos.csv"')
    res.send(csv)
  }),
)

export default router
