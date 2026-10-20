import type { RequestHandler } from 'express'
import { config } from '../config.js'
import { HttpError } from '../lib/http.js'

export const securityHeaders: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()')
  next()
}

/** Las respuestas de la API llevan datos personales y sesiones: nunca deben quedar en caché. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Defensa extra contra CSRF (además de SameSite=Lax): si una petición que modifica datos trae
 * cabecera Origin, debe ser el mismo host o uno de ALLOWED_ORIGINS.
 */
export const originCheck: RequestHandler = (req, _res, next) => {
  const origin = req.headers.origin
  if (SAFE_METHODS.has(req.method) || !origin) {
    next()
    return
  }
  let sameHost = false
  try {
    sameHost = new URL(origin).host === req.headers.host
  } catch {
    sameHost = false
  }
  if (sameHost || config.allowedOrigins.includes(origin)) {
    next()
    return
  }
  next(new HttpError(403, 'Origen no permitido.', 'forbidden_origin'))
}
