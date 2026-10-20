import path from 'node:path'
import express from 'express'
import { config } from './config.js'
import { pool } from './db.js'
import { asyncHandler } from './lib/http.js'
import { loadSession } from './middleware/auth.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { noStore, originCheck, securityHeaders } from './middleware/security.js'
import accessLogsRouter from './routes/accessLogs.js'
import accessPointsRouter from './routes/accessPoints.js'
import authRouter from './routes/auth.js'
import dashboardRouter from './routes/dashboard.js'
import employeesRouter from './routes/employees.js'
import meRouter from './routes/me.js'
import reportsRouter from './routes/reports.js'
import scanRouter from './routes/scan.js'
import settingsRouter from './routes/settings.js'
import usersRouter from './routes/users.js'

export function createApp() {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', config.trustProxy)

  app.use(securityHeaders)
  app.use('/api', noStore)
  app.use(express.json({ limit: '10kb' }))
  app.use('/api', originCheck)
  app.use('/api', loadSession)

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      await pool.query('select 1')
      res.json({ ok: true })
    }),
  )
  app.use('/api/auth', authRouter)
  app.use('/api/me', meRouter)
  app.use('/api/employees', employeesRouter)
  app.use('/api/access-logs', accessLogsRouter)
  app.use('/api/dashboard', dashboardRouter)
  app.use('/api/scan', scanRouter)
  app.use('/api/access-points', accessPointsRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/settings', settingsRouter)
  app.use('/api/users', usersRouter)
  app.use('/api', notFound)

  // Opcional: sirve el front compilado (npm run build) desde el mismo servidor.
  if (config.staticDir) {
    const dir = path.resolve(config.staticDir)
    // Los archivos de /assets llevan hash en el nombre: se pueden cachear un año. El HTML nunca.
    app.use('/assets', express.static(path.join(dir, 'assets'), { maxAge: '1y', immutable: true }))
    app.use(express.static(dir))
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache')
      res.sendFile(path.join(dir, 'index.html'))
    })
  }

  app.use(errorHandler)
  return app
}
