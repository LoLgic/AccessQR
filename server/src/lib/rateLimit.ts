import type { Request, RequestHandler } from 'express'
import { HttpError } from './http.js'

interface Options {
  windowMs: number
  max: number
  key: (req: Request) => string
}

/** Limitador en memoria (una sola instancia del servidor). Para varias instancias, usar Redis o una tabla. */
export function rateLimit({ windowMs, max, key }: Options): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return (req, res, next) => {
    const now = Date.now()
    if (hits.size > 5000) {
      for (const [k, entry] of hits) if (entry.resetAt <= now) hits.delete(k)
    }

    const k = key(req)
    let entry = hits.get(k)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(k, entry)
    }
    entry.count += 1

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      next(new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', 'rate_limited'))
      return
    }
    next()
  }
}
