import type { NextFunction, Request, RequestHandler, Response } from 'express'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string = 'error',
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

/** Express 4 no captura promesas rechazadas: las envía al manejador de errores. */
export const asyncHandler =
  (fn: AsyncHandler): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next)
  }

export function bodyObject(req: Request): Record<string, unknown> {
  const body: unknown = req.body
  if (body === undefined || body === null) return {}
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo de la petición debe ser un objeto JSON.', 'validation_error')
  }
  return body as Record<string, unknown>
}
