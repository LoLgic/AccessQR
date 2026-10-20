import { Router } from 'express'
import { pool } from '../db.js'
import { asyncHandler, bodyObject, HttpError } from '../lib/http.js'
import { str } from '../lib/validate.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

const LIST_SQL = `
  select p.id, p.name, count(l.id)::int as "accessCount"
    from access_points p
    left join access_logs l on l.access_point_id = p.id
   group by p.id
   order by p.id`

function idParam(value: unknown): number {
  const n = Number(value)
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, 'El parámetro "id" no es válido.', 'validation_error')
  return n
}

// El guardia necesita ver la lista para elegir su punto en el escáner.
router.get(
  '/',
  requireRole('admin', 'control_acceso'),
  asyncHandler(async (_req, res) => {
    res.json({ data: (await pool.query(LIST_SQL)).rows })
  }),
)

router.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const name = str(bodyObject(req).name, 'nombre', { min: 2, max: 80 })
    const { rows } = await pool.query('insert into access_points (name) values ($1) returning id, name', [name])
    res.status(201).json({ ...rows[0], accessCount: 0 })
  }),
)

router.patch(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id)
    const name = str(bodyObject(req).name, 'nombre', { min: 2, max: 80 })
    const { rows } = await pool.query('update access_points set name = $2 where id = $1 returning id, name', [id, name])
    if (!rows[0]) throw new HttpError(404, 'Punto de acceso no encontrado.', 'not_found')
    res.json(rows[0])
  }),
)

// Un punto con accesos registrados no se borra (se perdería la trazabilidad); tampoco el último que queda.
router.delete(
  '/:id',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const id = idParam(req.params.id)
    const { rows } = await pool.query(
      `select (select count(*)::int from access_logs where access_point_id = $1) as logs,
              (select count(*)::int from access_points) as points,
              exists (select 1 from access_points where id = $1) as found`,
      [id],
    )
    const info = rows[0]
    if (!info.found) throw new HttpError(404, 'Punto de acceso no encontrado.', 'not_found')
    if (info.logs > 0) throw new HttpError(409, 'No se puede eliminar: ya tiene accesos registrados.', 'conflict')
    if (info.points <= 1) throw new HttpError(409, 'Debe existir al menos un punto de acceso.', 'conflict')

    await pool.query('delete from access_points where id = $1', [id])
    res.status(204).end()
  }),
)


export default router
