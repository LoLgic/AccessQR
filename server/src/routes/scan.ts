import { Router } from 'express'
import { config } from '../config.js'
import { tx } from '../db.js'
import { asyncHandler, bodyObject } from '../lib/http.js'
import { optStr, str } from '../lib/validate.js'
import { getUser, requireRole } from '../middleware/auth.js'
import { processScan } from '../services/scan.js'

const router = Router()

router.post(
  '/',
  requireRole('admin', 'control_acceso'),
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const token = str(body.token, 'token', { max: 300 })
    const pointName = optStr(body.accessPoint, 'accessPoint', { max: 80 })
    const scanner = getUser(res)

    const result = await tx((db) =>
      processScan(db, { token, pointName, scannerId: scanner.id, secret: config.qrSecret, now: new Date() }),
    )
    res.json(result)
  }),
)

export default router
