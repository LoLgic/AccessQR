import { Router } from 'express'
import { config } from '../config.js'
import { requireRole } from '../middleware/auth.js'
import { DUPLICATE_WINDOW_MS } from '../services/scan.js'

const router = Router()

// Solo lectura: estos valores se definen con variables de entorno en el servidor.
router.get('/', requireRole('admin'), (_req, res) => {
  res.json({
    company: config.companyName,
    timeZone: config.timeZone,
    qrTtlSeconds: config.qrTtlSeconds,
    sessionTtlHours: config.sessionTtlHours,
    duplicateWindowSeconds: DUPLICATE_WINDOW_MS / 1000,
  })
})

export default router
