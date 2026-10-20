import { Router } from 'express'
import { config } from '../config.js'
import { pool } from '../db.js'
import { toCsv } from '../lib/csv.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { isoDate } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireRole('admin'))

export const MAX_RANGE_DAYS = 366
const DEFAULT_RANGE_DAYS = 30

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Rango [from, to] en días calendario. Por defecto, los últimos 30 días hasta hoy. */
export function resolveRange(query: Record<string, unknown>, today: string): { from: string; to: string } {
  const to = isoDate(query.to, 'to') ?? today
  const from = isoDate(query.from, 'from') ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1))
  if (from > to) throw new HttpError(400, 'La fecha inicial no puede ser posterior a la final.', 'validation_error')
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1
  if (days > MAX_RANGE_DAYS) {
    throw new HttpError(400, `El rango no puede superar ${MAX_RANGE_DAYS} días.`, 'validation_error')
  }
  return { from, to }
}

async function rangeFor(query: Record<string, unknown>) {
  const { rows } = await pool.query(`select (now() at time zone $1::text)::date::text as today`, [config.timeZone])
  return resolveRange(query, rows[0].today)
}

// $1 = zona horaria, $2 = desde, $3 = hasta (días completos en esa zona, usando el índice por fecha)
const IN_RANGE = `
  l.occurred_at >= ($2::date::timestamp at time zone $1::text)
  and l.occurred_at <  (($3::date + 1)::timestamp at time zone $1::text)`

const COUNTS = `
  count(l.id) filter (where l.movement = 'entrada' and l.result = 'autorizado')::int as entries,
  count(l.id) filter (where l.movement = 'salida'  and l.result = 'autorizado')::int as exits,
  count(l.id) filter (where l.result = 'denegado')::int as denied`

const DAILY_SQL = `
  select to_char(d, 'YYYY-MM-DD') as day, ${COUNTS}
    from generate_series($2::date::timestamp, $3::date::timestamp, interval '1 day') as d
    left join access_logs l
           on l.occurred_at >= (d at time zone $1::text)
          and l.occurred_at <  ((d + interval '1 day') at time zone $1::text)
   group by d
   order by d`

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const { from, to } = await rangeFor(req.query as Record<string, unknown>)
    const params = [config.timeZone, from, to]

    const [totals, daily, areas, hours, reasons] = await Promise.all([
      pool.query(
        `select ${COUNTS}, count(distinct l.employee_id) filter (where l.result = 'autorizado')::int as "uniqueEmployees"
           from access_logs l
          where ${IN_RANGE}`,
        params,
      ),
      pool.query(DAILY_SQL, params),
      pool.query(
        `select a.name as area, ${COUNTS}
           from access_logs l
           join employees e on e.id = l.employee_id
           join areas a on a.id = e.area_id
          where ${IN_RANGE}
          group by a.name
          order by count(l.id) desc, a.name`,
        params,
      ),
      pool.query(
        `select extract(hour from (l.occurred_at at time zone $1::text))::int as hour, count(*)::int as count
           from access_logs l
          where ${IN_RANGE} and l.result = 'autorizado'
          group by 1
          order by 1`,
        params,
      ),
      pool.query(
        `select l.reason, count(*)::int as count
           from access_logs l
          where ${IN_RANGE} and l.result = 'denegado'
          group by l.reason
          order by count(*) desc, l.reason
          limit 5`,
        params,
      ),
    ])

    res.json({
      from,
      to,
      totals: totals.rows[0],
      daily: daily.rows,
      byArea: areas.rows,
      byHour: hours.rows,
      denialReasons: reasons.rows,
    })
  }),
)

router.get(
  '/daily.csv',
  asyncHandler(async (req, res) => {
    const { from, to } = await rangeFor(req.query as Record<string, unknown>)
    const { rows } = await pool.query(DAILY_SQL, [config.timeZone, from, to])

    const csv = toCsv([
      ['Fecha', 'Entradas', 'Salidas', 'Denegados'],
      ...rows.map((r: { day: string; entries: number; exits: number; denied: number }) => [r.day, r.entries, r.exits, r.denied]),
    ])
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="reporte-accesos-${from}_a_${to}.csv"`)
    res.send(csv)
  }),
)

export default router
