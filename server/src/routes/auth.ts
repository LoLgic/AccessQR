import { randomBytes } from 'node:crypto'
import { Router } from 'express'
import { config } from '../config.js'
import { pool, tx } from '../db.js'
import { asyncHandler, bodyObject, HttpError } from '../lib/http.js'
import { dummyVerify, hashPassword, verifyPassword } from '../lib/password.js'
import { rateLimit } from '../lib/rateLimit.js'
import { escapeHtml, mailerEnabled, sendMail } from '../lib/mailer.js'
import { emailAddress, passwordPolicy, str } from '../lib/validate.js'
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroyAllSessions,
  destroyOtherSessions,
  destroySession,
  getUser,
  hashToken,
  readCookie,
  requireAuth,
  setSessionCookie,
  toAuthUser,
} from '../middleware/auth.js'

const router = Router()

// 10 intentos cada 15 minutos por IP + correo.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => `${req.ip}|${String((req.body as { email?: unknown } | undefined)?.email ?? '').toLowerCase().slice(0, 200)}`,
})

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const email = str(body.email, 'correo', { max: 200 }).toLowerCase()
    const password = body.password
    if (typeof password !== 'string' || password.length === 0 || password.length > 200) {
      throw new HttpError(400, 'Ingresa tu contraseña.', 'validation_error')
    }

    const { rows } = await pool.query(
      `select id, email, password_hash, full_name, role, employee_id
         from users
        where lower(email) = $1 and is_active`,
      [email],
    )
    const user = rows[0]
    const valid = user ? await verifyPassword(password, user.password_hash) : await dummyVerify(password)
    if (!user || !valid) throw new HttpError(401, 'Correo o contraseña incorrectos.', 'invalid_credentials')

    const remember = body.remember === true
    await pool.query('delete from sessions where expires_at < now()')
    const token = await createSession(pool, user.id, req.headers['user-agent'], remember)
    setSessionCookie(res, token, remember)
    res.json({ user: toAuthUser(user) })
  }),
)

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE)
    if (token) await destroySession(pool, token)
    clearSessionCookie(res)
    res.status(204).end()
  }),
)

// Cambiar la propia contraseña. Cierra todas las demás sesiones de la cuenta y conserva la actual.
const passwordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8, key: (req) => `pw|${req.ip}` })

router.post(
  '/change-password',
  requireAuth,
  passwordLimiter,
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const user = getUser(res)
    const current = body.currentPassword
    if (typeof current !== 'string' || current.length === 0 || current.length > 200) {
      throw new HttpError(400, 'Ingresa tu contraseña actual.', 'validation_error')
    }
    const next = passwordPolicy(body.newPassword, user.email, 'nueva contraseña')

    const { rows } = await pool.query('select password_hash from users where id = $1', [user.id])
    if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
      throw new HttpError(400, 'La contraseña actual no es correcta.', 'invalid_credentials')
    }
    if (current === next) throw new HttpError(400, 'La nueva contraseña debe ser distinta de la actual.', 'validation_error')

    const hash = await hashPassword(next)
    await pool.query('update users set password_hash = $2 where id = $1', [user.id, hash])
    const token = readCookie(req.headers.cookie, SESSION_COOKIE)
    if (token) await destroyOtherSessions(pool, user.id, token)
    res.status(204).end()
  }),
)

/* ---------- recuperación de contraseña por correo (opcional: requiere SMTP) ---------- */

const RESET_MINUTES = 30
const forgotLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, key: (req) => `forgot|${req.ip}` })
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, key: (req) => `reset|${req.ip}` })

// El front pregunta si debe ofrecer "Recuperar contraseña".
router.get('/config', (_req, res) => {
  res.json({ passwordReset: mailerEnabled() })
})

async function sendResetEmail(email: string): Promise<void> {
  const { rows } = await pool.query('select id, full_name from users where lower(email) = $1 and is_active', [email])
  const user = rows[0]
  if (!user) return // no se revela si el correo existe

  const token = randomBytes(32).toString('base64url')
  await tx(async (db) => {
    await db.query('delete from password_resets where expires_at < now() - interval \'1 day\'')
    await db.query('delete from password_resets where user_id = $1 and used_at is null', [user.id])
    await db.query(
      `insert into password_resets (user_id, token_hash, expires_at)
       values ($1, $2, now() + make_interval(mins => $3::int))`,
      [user.id, hashToken(token), RESET_MINUTES],
    )
  })

  const link = `${config.appUrl}/restablecer?token=${token}`
  await sendMail({
    to: email,
    subject: 'Restablece tu contraseña de AccessQR',
    text:
      `Hola ${user.full_name},\n\n` +
      `Recibimos una solicitud para restablecer tu contraseña de AccessQR. Abre este enlace (vale ${RESET_MINUTES} minutos y solo se puede usar una vez):\n\n${link}\n\n` +
      'Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.',
    html:
      `<p>Hola ${escapeHtml(user.full_name)},</p>` +
      `<p>Recibimos una solicitud para restablecer tu contraseña de AccessQR. El enlace vale ${RESET_MINUTES} minutos y solo se puede usar una vez:</p>` +
      `<p><a href="${link}">Restablecer mi contraseña</a></p>` +
      '<p>Si no fuiste tú, ignora este mensaje: tu contraseña no cambiará.</p>',
  })
}

router.post(
  '/forgot-password',
  forgotLimiter,
  asyncHandler(async (req, res) => {
    if (!mailerEnabled()) {
      throw new HttpError(503, 'La recuperación por correo no está activada. Pide al administrador que restablezca tu contraseña.', 'not_configured')
    }
    const email = emailAddress(bodyObject(req).email)
    // Misma respuesta exista o no el correo; el envío ocurre después de responder (así tampoco se nota por el tiempo).
    res.status(202).json({ ok: true })
    sendResetEmail(email).catch((error) => console.error('[recuperación] no se pudo procesar la solicitud:', error))
  }),
)

router.post(
  '/reset-password',
  resetLimiter,
  asyncHandler(async (req, res) => {
    const body = bodyObject(req)
    const token = str(body.token, 'token', { max: 100 })

    await tx(async (db) => {
      const row = (
        await db.query(
          `select r.id, r.user_id, u.email
             from password_resets r
             join users u on u.id = r.user_id
            where r.token_hash = $1 and r.used_at is null and r.expires_at > now() and u.is_active
              for update of r`,
          [hashToken(token)],
        )
      ).rows[0]
      if (!row) throw new HttpError(400, 'El enlace no es válido o ya venció. Solicita uno nuevo.', 'invalid_token')

      // Si la contraseña no cumple la política, se lanza el error y el enlace NO se consume.
      const password = passwordPolicy(body.password, row.email, 'nueva contraseña')
      const hash = await hashPassword(password)

      await db.query('update users set password_hash = $2 where id = $1', [row.user_id, hash])
      await db.query('update password_resets set used_at = now() where user_id = $1 and used_at is null', [row.user_id])
      await destroyAllSessions(db, row.user_id)
    })
    res.status(204).end()
  }),
)

router.get('/me', requireAuth, (_req, res) => {
  res.json({ user: getUser(res) })
})

export default router
