import { createHash, randomBytes } from 'node:crypto'
import type { RequestHandler, Response } from 'express'
import { config } from '../config.js'
import { pool, type Db } from '../db.js'
import { HttpError } from '../lib/http.js'

export type Role = 'admin' | 'control_acceso' | 'empleado'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: Role
  employeeId: string | null
}

export const SESSION_COOKIE = 'aq_session'
const REMEMBER_HOURS = 24 * 30

export const hashToken = (token: string): Buffer => createHash('sha256').update(token).digest()

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const index = part.indexOf('=')
    if (index === -1) continue
    if (part.slice(0, index).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      return undefined
    }
  }
  return undefined
}

export function toAuthUser(row: any): AuthUser {
  return { id: row.id, email: row.email, fullName: row.full_name, role: row.role, employeeId: row.employee_id }
}

/** Crea una sesión y devuelve el token (solo se guarda su hash en la base de datos). */
export async function createSession(
  db: Db,
  userId: string,
  userAgent: string | undefined,
  remember = false,
): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db.query(
    `insert into sessions (user_id, token_hash, user_agent, expires_at)
     values ($1, $2, $3, now() + make_interval(hours => $4::int))`,
    [userId, hashToken(token), userAgent?.slice(0, 300) ?? null, remember ? REMEMBER_HOURS : config.sessionTtlHours],
  )
  return token
}

export async function destroySession(db: Db, token: string): Promise<void> {
  await db.query('delete from sessions where token_hash = $1', [hashToken(token)])
}

/** Cierra todas las sesiones de un usuario salvo la indicada. */
export async function destroyOtherSessions(db: Db, userId: string, keepToken: string): Promise<void> {
  await db.query('delete from sessions where user_id = $1 and token_hash <> $2', [userId, hashToken(keepToken)])
}

/** Cierra todas las sesiones de un usuario (al desactivarlo o restablecer su contraseña). */
export async function destroyAllSessions(db: Db, userId: string): Promise<void> {
  await db.query('delete from sessions where user_id = $1', [userId])
}

/** Con "recordarme" la cookie dura 30 días; sin él es una cookie de sesión (se borra al cerrar el navegador). */
export function setSessionCookie(res: Response, token: string, remember = false): void {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.isProduction,
    path: '/',
    maxAge: remember ? REMEMBER_HOURS * 60 * 60 * 1000 : undefined,
  })
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.isProduction, path: '/' })
}

/** Si la cookie corresponde a una sesión vigente, deja el usuario en res.locals.user. */
export const loadSession: RequestHandler = async (req, res, next) => {
  try {
    const token = readCookie(req.headers.cookie, SESSION_COOKIE)
    if (token) {
      const { rows } = await pool.query(
        `select u.id, u.email, u.full_name, u.role, u.employee_id
           from sessions s
           join users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now() and u.is_active`,
        [hashToken(token)],
      )
      if (rows[0]) res.locals.user = toAuthUser(rows[0])
    }
    next()
  } catch (error) {
    next(error)
  }
}

export function getUser(res: Response): AuthUser {
  return res.locals.user as AuthUser
}

export const requireAuth: RequestHandler = (_req, res, next) => {
  if (!res.locals.user) {
    next(new HttpError(401, 'Inicia sesión para continuar.', 'unauthenticated'))
    return
  }
  next()
}

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (_req, res, next) => {
    const user = res.locals.user as AuthUser | undefined
    if (!user) {
      next(new HttpError(401, 'Inicia sesión para continuar.', 'unauthenticated'))
      return
    }
    if (!roles.includes(user.role)) {
      next(new HttpError(403, 'No tienes permiso para realizar esta acción.', 'forbidden'))
      return
    }
    next()
  }
