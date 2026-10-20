import { HttpError } from './http.js'

const bad = (message: string) => new HttpError(400, message, 'validation_error')

export function str(value: unknown, field: string, { min = 1, max = 200 } = {}): string {
  if (typeof value !== 'string') throw bad(`El campo "${field}" es obligatorio.`)
  const v = value.trim()
  if (v.length < min) throw bad(`El campo "${field}" es obligatorio.`)
  if (v.length > max) throw bad(`El campo "${field}" no puede superar ${max} caracteres.`)
  return v
}

export function optStr(value: unknown, field: string, opts?: { min?: number; max?: number }): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return str(value, field, opts)
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw bad(`El campo "${field}" debe ser uno de: ${allowed.join(', ')}.`)
  }
  return value as T
}

export function optOneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return oneOf(value, field, allowed)
}

/** Acepta "1.002.345.678" o "1002345678" y devuelve solo los dígitos. */
export function documentNumber(value: unknown, field = 'document'): string {
  if (typeof value !== 'string' && typeof value !== 'number') throw bad(`El campo "${field}" es obligatorio.`)
  const digits = String(value).replace(/[\s.\-]/g, '')
  if (!/^[0-9]{5,15}$/.test(digits)) throw bad('La identificación debe tener entre 5 y 15 dígitos.')
  return digits
}

/** Parámetro de query como texto (si llega repetido o vacío, se ignora). */
export function queryText(value: unknown, max = 100): string | undefined {
  if (typeof value !== 'string') return undefined
  const v = value.trim()
  return v === '' ? undefined : v.slice(0, max)
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

export function uuidParam(value: unknown, field = 'id'): string {
  if (!isUuid(value)) throw bad(`El parámetro "${field}" no es válido.`)
  return value
}

/** Fecha AAAA-MM-DD real (rechaza 2026-02-31). */
export function isoDate(value: unknown, field = 'date'): string | undefined {
  const v = queryText(value, 40) // sin recortar a 10: un texto más largo debe rechazarse, no truncarse
  if (v === undefined) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (match) {
    const [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])]
    const date = new Date(Date.UTC(y, m - 1, d))
    if (date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) return v
  }
  throw bad(`El parámetro "${field}" debe tener formato AAAA-MM-DD.`)
}

export function intParam(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'string' || value.trim() === '') return fallback
  const n = Number(value)
  if (!Number.isInteger(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

export function paging(query: Record<string, unknown>, defaultSize = 10, maxSize = 100) {
  const pageSize = intParam(query.pageSize, defaultSize, 1, maxSize)
  const page = intParam(query.page, 1, 1, 1_000_000)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

/** Escapa % _ \ para usar el texto dentro de un LIKE/ILIKE. */
export function likePattern(text: string): string {
  return `%${text.replace(/[\\%_]/g, '\\$&')}%`
}

/** Construye ORDER BY solo con columnas de una lista blanca (nunca con texto del usuario). */
export function orderBy(
  query: Record<string, unknown>,
  columns: Record<string, string>,
  fallback: string,
  tieBreaker: string,
): string {
  const key = queryText(query.sort, 30)
  const dir = queryText(query.dir, 4) === 'desc' ? 'desc' : 'asc'
  const column = key !== undefined && Object.prototype.hasOwnProperty.call(columns, key) ? columns[key] : undefined
  if (!column) return `order by ${fallback}`
  return `order by ${column} ${dir} nulls last, ${tieBreaker}`
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function emailAddress(value: unknown, field = 'correo'): string {
  const email = str(value, field, { max: 200 }).toLowerCase()
  if (!EMAIL_PATTERN.test(email)) throw bad(`El campo "${field}" no es un correo válido.`)
  return email
}

/** Política de contraseñas: 10+ caracteres, con letras y números, y distinta del correo. */
export function passwordPolicy(value: unknown, email?: string, field = 'contraseña'): string {
  if (typeof value !== 'string' || value.length === 0) throw bad(`El campo "${field}" es obligatorio.`)
  if (value.length < 10) throw bad('La contraseña debe tener al menos 10 caracteres.')
  if (value.length > 200) throw bad('La contraseña no puede superar 200 caracteres.')
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) throw bad('La contraseña debe incluir letras y números.')
  if (email && value.toLowerCase() === email.toLowerCase()) throw bad('La contraseña no puede ser igual al correo.')
  return value
}
