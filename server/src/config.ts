import 'dotenv/config'

const DEV_SECRET = 'dev-only-secret-change-me-0123456789abcdef'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Falta la variable de entorno ${name}. Revisa server/.env (ver .env.example).`)
  return value
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === '') return fallback
  const n = Number(raw)
  if (!Number.isInteger(n) || n <= 0) throw new Error(`${name} debe ser un entero positivo.`)
  return n
}

const nodeEnv = process.env.NODE_ENV ?? 'development'
const qrSecret = required('QR_SECRET')

if (qrSecret.length < 32) throw new Error('QR_SECRET debe tener al menos 32 caracteres.')
if (nodeEnv === 'production' && qrSecret === DEV_SECRET) {
  throw new Error('QR_SECRET sigue con el valor de ejemplo. Genera uno propio antes de usar producción.')
}

const mailHost = process.env.SMTP_HOST || undefined
const memoryMail = process.env.MAIL_TRANSPORT === 'memory'
if (nodeEnv === 'production' && memoryMail) throw new Error('MAIL_TRANSPORT=memory es solo para pruebas.')
if (mailHost && !process.env.SMTP_FROM) throw new Error('Con SMTP_HOST debes definir también SMTP_FROM (el remitente).')

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: positiveInt('PORT', 3001),
  databaseUrl: required('DATABASE_URL'),
  qrSecret,
  qrTtlSeconds: positiveInt('QR_TTL_SECONDS', 120),
  sessionTtlHours: positiveInt('SESSION_TTL_HOURS', 12),
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  timeZone: process.env.APP_TIME_ZONE ?? 'America/Bogota',
  companyName: process.env.COMPANY_NAME ?? 'NovaTech Solutions',
  trustProxy: process.env.TRUST_PROXY === 'true',
  staticDir: process.env.STATIC_DIR,
  // URL pública del front: se usa en los enlaces de los correos (en Render, RENDER_EXTERNAL_URL la pone la plataforma).
  appUrl: (process.env.APP_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  mail: {
    host: mailHost,
    port: positiveInt('SMTP_PORT', 587),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || undefined,
    pass: process.env.SMTP_PASS || undefined,
    from: process.env.SMTP_FROM ?? 'AccessQR <no-reply@localhost>',
    memory: memoryMail,
  },
}
