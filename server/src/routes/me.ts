import { Router } from 'express'
import { config } from '../config.js'
import { pool } from '../db.js'
import { asyncHandler, HttpError } from '../lib/http.js'
import { issueQrToken } from '../lib/qrToken.js'
import { intParam } from '../lib/validate.js'
import { getUser, requireAuth } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

router.get(
  '/card',
  asyncHandler(async (_req, res) => {
    const { employeeId } = getUser(res)
    if (!employeeId) throw new HttpError(404, 'Tu usuario no tiene un carnet asociado.', 'not_found')

    const { rows } = await pool.query(
      `select e.code, e.full_name as "fullName", e.document, e.position, a.name as area,
              e.status, c.status as "credentialStatus", c.token_version as "tokenVersion"
         from employees e
         join areas a on a.id = e.area_id
         join credentials c on c.employee_id = e.id
        where e.id = $1`,
      [employeeId],
    )
    const emp = rows[0]
    if (!emp) throw new HttpError(404, 'Tu usuario no tiene un carnet asociado.', 'not_found')

    // Solo se emite QR si el carnet puede usarse. El código dura pocos minutos y el carnet lo renueva solo.
    const usable = emp.status === 'activo' && emp.credentialStatus === 'vigente'
    const issued = usable ? issueQrToken(config.qrSecret, emp.code, emp.tokenVersion, config.qrTtlSeconds) : null

    res.json({
      company: config.companyName,
      employee: {
        code: emp.code,
        fullName: emp.fullName,
        document: emp.document,
        position: emp.position,
        area: emp.area,
        status: emp.status,
        credentialStatus: emp.credentialStatus,
      },
      qr: issued ? { token: issued.token, expiresAt: issued.expiresAt.toISOString(), ttlSeconds: config.qrTtlSeconds } : null,
    })
  }),
)

router.get(
  '/access-logs',
  asyncHandler(async (req, res) => {
    const { employeeId } = getUser(res)
    if (!employeeId) throw new HttpError(404, 'Tu usuario no tiene un carnet asociado.', 'not_found')
    const limit = intParam((req.query as Record<string, unknown>).limit, 20, 1, 100)

    const { rows } = await pool.query(
      `select l.id::text as id, l.occurred_at as "occurredAt", l.movement, l.result, l.reason, p.name as point
         from access_logs l
         join access_points p on p.id = l.access_point_id
        where l.employee_id = $1
        order by l.occurred_at desc, l.id desc
        limit $2`,
      [employeeId, limit],
    )
    res.json({ data: rows })
  }),
)

export default router
