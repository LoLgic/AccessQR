import { Router } from 'express'
import { pool, tx, type Db } from '../db.js'
import { asyncHandler, bodyObject, HttpError } from '../lib/http.js'
import { hashPassword } from '../lib/password.js'
import {
  emailAddress,
  likePattern,
  oneOf,
  optOneOf,
  optStr,
  orderBy,
  paging,
  passwordPolicy,
  queryText,
  str,
  uuidParam,
} from '../lib/validate.js'
import { destroyAllSessions, getUser, requireRole, type Role } from '../middleware/auth.js'

const router = Router()
router.use(requireRole('admin'))

const ROLES = ['admin', 'control_acceso', 'empleado'] as const satisfies readonly Role[]

const SELECT = `
  select u.id, u.email, u.full_name as "fullName", u.role, u.is_active as "isActive",
         u.created_at as "createdAt", u.employee_id as "employeeId", e.code as "employeeCode"`
const FROM = `
  from users u
  left join employees e on e.id = u.employee_id`

const SORT_COLUMNS: Record<string, string> = {
  name: 'u.full_name',
  email: 'u.email',
  role: 'u.role',
  status: 'u.is_active',
  createdAt: 'u.created_at',
}

function userWhere(query: Record<string, unknown>, params: unknown[]): string {
  const conds: string[] = []

  const q = queryText(query.q)
  if (q) {
    params.push(likePattern(q))
    const n = `$${params.length}`
    conds.push(`(unaccent(u.full_name) ilike unaccent(${n}::text) or u.email ilike ${n}::text)`)
  }
  const role = optOneOf(query.role, 'role', ROLES)
  if (role) {
    params.push(role)
    conds.push(`u.role = $${params.length}::user_role`)
  }
  const active = optOneOf(query.active, 'active', ['true', 'false'] as const)
  if (active) {
    params.push(active === 'true')
    conds.push(`u.is_active = $${params.length}::boolean`)
  }
  return conds.length ? `where ${conds.join(' and ')}` : ''
}

async function fetchUser(db: Db, id: string) {
  const { rows } = await db.query(`${SELECT} ${FROM} where u.id = $1`, [id])
  if (!rows[0]) throw new HttpError(404, 'Usuario no encontrado.', 'not_found')
  return rows[0]
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = req.query as Record<string, unknown>
    const { page, pageSize, offset } = paging(query, 10, 100)
    const params: unknown[] = []
    const where = userWhere(query, params)
    const order = orderBy(query, SORT_COLUMNS, 'u.full_name asc', 'u.id')

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

// Empleados que todavía no tienen usuario (para vincularlos al crear uno).
router.get(
  '/linkable-employees',
  asyncHandler(async (req, res) => {
    const params: unknown[] = []
    let search = ''
    const q = queryText((req.query as Record<string, unknown>).q)
    if (q) {
      params.push(likePattern(q))
      search = `and unaccent(e.full_name) ilike unaccent($1::text)`
    }
    const { rows } = await pool.query(
      `select e.id, e.code, e.full_name as "fullName"
         from employees e
        where e.status = 'activo'
          and not exists (select 1 from users u where u.employee_id = e.id)
          ${search}
        order by e.full_name
        limit 200`,
      params,
    )
    res.json({ data: rows })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const email = emailAddress(body.email)
    const fullName = str(body.fullName, 'nombre', { min: 3, max: 120 })
    const role = oneOf(body.role, 'role', ROLES)
    const password = passwordPolicy(body.password, email)
    const employeeId = optStr(body.employeeId, 'employeeId', { max: 40 })

    if (employeeId !== undefined) uuidParam(employeeId, 'employeeId')
    if (role === 'empleado' && !employeeId) {
      throw new HttpError(400, 'Un usuario con rol Empleado debe estar vinculado a un empleado.', 'validation_error')
    }

    const hash = await hashPassword(password)
    const user = await tx(async (db) => {
      if (employeeId) {
        const emp = (await db.query('select status from employees where id = $1', [employeeId])).rows[0]
        if (!emp) throw new HttpError(400, 'El empleado indicado no existe.', 'validation_error')
        if (emp.status !== 'activo') throw new HttpError(409, 'El empleado indicado está inactivo.', 'conflict')
      }
      const { rows } = await db.query(
        `insert into users (email, password_hash, full_name, role, employee_id)
         values ($1, $2, $3, $4::user_role, $5) returning id`,
        [email, hash, fullName, role, employeeId ?? null],
      )
      return fetchUser(db, rows[0].id)
    })
    res.status(201).json(user)
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = uuidParam(req.params.id)
    const body = bodyObject(req)
    const has = (key: string) => Object.prototype.hasOwnProperty.call(body, key)
    const actor = getUser(res)

    const fullName = has('fullName') ? str(body.fullName, 'nombre', { min: 3, max: 120 }) : undefined
    const role = has('role') ? oneOf(body.role, 'role', ROLES) : undefined
    const isActive = has('isActive') ? body.isActive : undefined
    if (isActive !== undefined && typeof isActive !== 'boolean') {
      throw new HttpError(400, 'El campo "isActive" debe ser verdadero o falso.', 'validation_error')
    }
    if (fullName === undefined && role === undefined && isActive === undefined) {
      throw new HttpError(400, 'No hay cambios para guardar.', 'validation_error')
    }

    const user = await tx(async (db) => {
      const current = (await db.query('select role, is_active, employee_id from users where id = $1 for update', [id])).rows[0]
      if (!current) throw new HttpError(404, 'Usuario no encontrado.', 'not_found')

      const losesAdmin = current.role === 'admin' && current.is_active && (role !== undefined && role !== 'admin' || isActive === false)

      if (id === actor.id && (losesAdmin || isActive === false)) {
        throw new HttpError(409, 'No puedes desactivar tu propio usuario ni quitarte el rol de administrador.', 'conflict')
      }
      if (role === 'empleado' && !current.employee_id) {
        throw new HttpError(400, 'Este usuario no está vinculado a un empleado, así que no puede tener rol Empleado.', 'validation_error')
      }
      if (losesAdmin) {
        // Se bloquean los administradores activos para que dos cambios simultáneos no dejen el sistema sin ninguno.
        const admins = (await db.query(`select id from users where role = 'admin' and is_active for update`)).rows as { id: string }[]
        if (!admins.some((a) => a.id !== id)) {
          throw new HttpError(409, 'Debe quedar al menos un administrador activo.', 'conflict')
        }
      }

      const sets: string[] = []
      const params: unknown[] = [id]
      const set = (sql: string, value: unknown) => {
        params.push(value)
        sets.push(sql.replace('$?', `$${params.length}`))
      }
      if (fullName !== undefined) set('full_name = $?', fullName)
      if (role !== undefined) set('role = $?::user_role', role)
      if (isActive !== undefined) set('is_active = $?::boolean', isActive)
      await db.query(`update users set ${sets.join(', ')} where id = $1`, params)

      if (isActive === false) await destroyAllSessions(db, id)
      return fetchUser(db, id)
    })
    res.json(user)
  }),
)

// El administrador restablece la contraseña de otra persona; se cierran sus sesiones.
router.post(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const id = uuidParam(req.params.id)
    if (id === getUser(res).id) {
      throw new HttpError(400, 'Para tu propio usuario usa "Cambiar contraseña".', 'validation_error')
    }
    const body = bodyObject(req)

    const target = (await pool.query('select email from users where id = $1', [id])).rows[0]
    if (!target) throw new HttpError(404, 'Usuario no encontrado.', 'not_found')
    const password = passwordPolicy(body.password, target.email, 'nueva contraseña')
    const hash = await hashPassword(password)

    await tx(async (db) => {
      await db.query('update users set password_hash = $2 where id = $1', [id, hash])
      await destroyAllSessions(db, id)
    })
    res.status(204).end()
  }),
)

export default router
