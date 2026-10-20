import { Router } from 'express'
import { pool, tx, type Db } from '../db.js'
import { asyncHandler, bodyObject, HttpError } from '../lib/http.js'
import {
  documentNumber,
  likePattern,
  oneOf,
  optOneOf,
  orderBy,
  paging,
  queryText,
  str,
  uuidParam,
} from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireRole('admin'))

const EMPLOYEE_STATUS = ['activo', 'inactivo'] as const
const CREDENTIAL_STATUS = ['vigente', 'inactiva', 'por_revisar'] as const

const SELECT = `
  select e.id, e.code, e.full_name as "fullName", e.document, e.position, a.name as area,
         e.status, c.status as "credentialStatus", e.last_access_at as "lastAccessAt"`
const FROM = `
  from employees e
  join areas a on a.id = e.area_id
  join credentials c on c.employee_id = e.id`

const SORT_COLUMNS: Record<string, string> = {
  name: 'e.full_name',
  document: 'e.document',
  role: 'e.position',
  area: 'a.name',
  status: 'e.status',
  credential: 'c.status',
  lastAccess: 'e.last_access_at',
}

/** Arma el WHERE con parámetros numerados ($1, $2…). Nunca concatena texto del usuario. */
export function employeeWhere(query: Record<string, unknown>, params: unknown[]): string {
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

  const status = optOneOf(query.status, 'status', EMPLOYEE_STATUS)
  if (status) {
    params.push(status)
    conds.push(`e.status = $${params.length}::employee_status`)
  }
  const credential = optOneOf(query.credential, 'credential', CREDENTIAL_STATUS)
  if (credential) {
    params.push(credential)
    conds.push(`c.status = $${params.length}::credential_status`)
  }
  const area = queryText(query.area)
  if (area) {
    params.push(area)
    conds.push(`a.name = $${params.length}::text`)
  }
  const position = queryText(query.position)
  if (position) {
    params.push(position)
    conds.push(`e.position = $${params.length}::text`)
  }

  return conds.length ? `where ${conds.join(' and ')}` : ''
}

async function upsertArea(db: Db, name: string): Promise<number> {
  const { rows } = await db.query(
    'insert into areas (name) values ($1) on conflict (name) do update set name = excluded.name returning id',
    [name],
  )
  return rows[0].id
}

async function fetchEmployee(db: Db, id: string) {
  const { rows } = await db.query(`${SELECT} ${FROM} where e.id = $1`, [id])
  if (!rows[0]) throw new HttpError(404, 'Empleado no encontrado.', 'not_found')
  return rows[0]
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>
    const { page, pageSize, offset } = paging(query, 10, 100)

    const params: unknown[] = []
    const where = employeeWhere(query, params)
    const order = orderBy(query, SORT_COLUMNS, 'e.full_name asc', 'e.id')

    const [rows, count] = await Promise.all([
      pool.query(`${SELECT} ${FROM} ${where} ${order} limit $${params.length + 1} offset $${params.length + 2}`, [
        ...params,
        pageSize,
        offset,
      ]),
      pool.query(`select count(*)::int as total ${FROM} ${where}`, params),
    ])

    res.json({ data: rows.rows, total: count.rows[0].total, page, pageSize })
  }),
)

router.get(
  '/filters',
  asyncHandler(async (_req, res) => {
    const [areas, positions] = await Promise.all([
      pool.query('select name from areas order by name'),
      pool.query('select distinct position from employees order by position'),
    ])
    res.json({
      areas: areas.rows.map((r: { name: string }) => r.name),
      positions: positions.rows.map((r: { position: string }) => r.position),
    })
  }),
)

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await fetchEmployee(pool, uuidParam(req.params.id)))
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const fullName = str(body.fullName, 'nombre', { min: 3, max: 120 })
    const document = documentNumber(body.document)
    const position = str(body.position, 'cargo', { max: 80 })
    const areaName = str(body.area, 'área', { max: 80 })

    const employee = await tx(async (db) => {
      const areaId = await upsertArea(db, areaName)
      const code = (await db.query(`select 'NT-' || lpad(nextval('employee_code_seq')::text, 5, '0') as code`)).rows[0].code
      const { rows } = await db.query(
        `insert into employees (code, full_name, document, position, area_id)
         values ($1, $2, $3, $4, $5) returning id`,
        [code, fullName, document, position, areaId],
      )
      await db.query('insert into credentials (employee_id) values ($1)', [rows[0].id])
      return fetchEmployee(db, rows[0].id)
    })

    res.status(201).json(employee)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = uuidParam(req.params.id)
    const body = bodyObject(req)
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)

    const employee = await tx(async (db) => {
      const current = (await db.query('select status from employees where id = $1 for update', [id])).rows[0]
      if (!current) throw new HttpError(404, 'Empleado no encontrado.', 'not_found')

      const sets: string[] = []
      const params: unknown[] = [id]
      const set = (column: string, value: unknown) => {
        params.push(value)
        sets.push(`${column} = $${params.length}`)
      }

      if (has('fullName')) set('full_name', str(body.fullName, 'nombre', { min: 3, max: 120 }))
      if (has('document')) set('document', documentNumber(body.document))
      if (has('position')) set('position', str(body.position, 'cargo', { max: 80 }))
      if (has('area')) set('area_id', await upsertArea(db, str(body.area, 'área', { max: 80 })))
      const status = has('status') ? oneOf(body.status, 'status', EMPLOYEE_STATUS) : undefined
      if (status) set('status', status)

      if (sets.length === 0) throw new HttpError(400, 'No hay cambios para guardar.', 'validation_error')
      await db.query(`update employees set ${sets.join(', ')} where id = $1`, params)

      // Inactivar al empleado inactiva su credencial; reactivarlo emite una nueva (los QR viejos dejan de valer).
      if (status && status !== current.status) {
        if (status === 'inactivo') {
          await db.query(`update credentials set status = 'inactiva' where employee_id = $1`, [id])
        } else {
          await db.query(
            `update credentials set status = 'vigente', token_version = token_version + 1, issued_at = now() where employee_id = $1`,
            [id],
          )
        }
      }
      return fetchEmployee(db, id)
    })

    res.json(employee)
  }),
)

router.post(
  '/:id/credential/rotate',
  asyncHandler(async (req, res) => {
    const id = uuidParam(req.params.id)
    const employee = await tx(async (db) => {
      const current = (await db.query('select status from employees where id = $1 for update', [id])).rows[0]
      if (!current) throw new HttpError(404, 'Empleado no encontrado.', 'not_found')
      if (current.status !== 'activo') {
        throw new HttpError(409, 'El empleado está inactivo. Actívalo antes de regenerar su credencial.', 'conflict')
      }
      await db.query(
        `update credentials set status = 'vigente', token_version = token_version + 1, issued_at = now() where employee_id = $1`,
        [id],
      )
      return fetchEmployee(db, id)
    })
    res.json(employee)
  }),
)

router.patch(
  '/:id/credential',
  asyncHandler(async (req, res) => {
    const id = uuidParam(req.params.id)
    const status = oneOf(bodyObject(req).status, 'status', ['vigente', 'por_revisar'] as const)

    const employee = await tx(async (db) => {
      const current = (await db.query('select status from employees where id = $1 for update', [id])).rows[0]
      if (!current) throw new HttpError(404, 'Empleado no encontrado.', 'not_found')
      if (current.status !== 'activo') {
        throw new HttpError(409, 'El empleado está inactivo: su credencial no se puede cambiar.', 'conflict')
      }
      await db.query('update credentials set status = $2::credential_status where employee_id = $1', [id, status])
      return fetchEmployee(db, id)
    })
    res.json(employee)
  }),
)

export default router
