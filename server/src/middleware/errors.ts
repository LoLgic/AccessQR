import type { ErrorRequestHandler, RequestHandler } from 'express'
import { HttpError } from '../lib/http.js'

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new HttpError(404, 'Ruta no encontrada.', 'not_found'))
}

const UNIQUE_MESSAGES: Record<string, string> = {
  employees_document_key: 'Ya existe un empleado con esa identificación.',
  employees_code_key: 'Ya existe un empleado con ese código.',
  users_email_key: 'Ya existe un usuario con ese correo.',
  users_employee_key: 'Ese empleado ya tiene un usuario.',
  access_points_name_key: 'Ya existe un punto de acceso con ese nombre.',
}

const CHECK_MESSAGES: Record<string, string> = {
  employees_document_format: 'La identificación debe tener entre 5 y 15 dígitos.',
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { message: err.message, code: err.code } })
    return
  }

  const pg = err as { code?: string; constraint?: string; type?: string }

  if (pg.code === '23505') {
    const message = (pg.constraint && UNIQUE_MESSAGES[pg.constraint]) || 'Ya existe un registro con esos datos.'
    res.status(409).json({ error: { message, code: 'conflict' } })
    return
  }
  if (pg.code === '23503') {
    res.status(400).json({ error: { message: 'El registro relacionado no existe.', code: 'validation_error' } })
    return
  }
  if (pg.code === '23514') {
    const message = (pg.constraint && CHECK_MESSAGES[pg.constraint]) || 'Los datos enviados no son válidos.'
    res.status(400).json({ error: { message, code: 'validation_error' } })
    return
  }
  if (pg.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'El cuerpo de la petición no es un JSON válido.', code: 'validation_error' } })
    return
  }
  if (pg.type === 'entity.too.large') {
    res.status(413).json({ error: { message: 'La petición es demasiado grande.', code: 'payload_too_large' } })
    return
  }

  console.error('[error]', err)
  res.status(500).json({ error: { message: 'Error interno del servidor.', code: 'internal_error' } })
}
