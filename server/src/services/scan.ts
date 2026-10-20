import type { Db } from '../db.js'
import { HttpError } from '../lib/http.js'
import { hasValidSignature, isExpired, parseQrToken } from '../lib/qrToken.js'

export type Movement = 'entrada' | 'salida'

export interface ScanInput {
  token: string
  pointName?: string
  scannerId: string
  secret: string
  now: Date
}

export interface ScanEmployee {
  code: string
  fullName: string
  position: string
  document: string
  status: string
}

export interface ScanResponse {
  outcome: 'authorized' | 'denied' | 'invalid'
  occurredAt: string
  message?: string
  reason?: string
  movement?: Movement
  duplicate?: boolean
  employee?: ScanEmployee
}

/** Si el mismo carnet se lee dos veces en este intervalo, la segunda lectura no crea otro registro. */
export const DUPLICATE_WINDOW_MS = 10_000

/**
 * Valida un QR y registra el resultado. Debe ejecutarse dentro de una transacción:
 * bloquea la fila del empleado (FOR UPDATE) para que dos lecturas simultáneas no se pisen.
 */
export async function processScan(db: Db, input: ScanInput): Promise<ScanResponse> {
  const { token, pointName, scannerId, secret, now } = input
  const occurredAt = now.toISOString()

  // Sin punto indicado se usa el primero que se creó.
  const point = (
    pointName === undefined
      ? await db.query('select id from access_points order by id limit 1')
      : await db.query('select id from access_points where name = $1', [pointName])
  ).rows[0]
  if (!point) throw new HttpError(400, 'El punto de acceso no existe.', 'validation_error')

  const invalid: ScanResponse = {
    outcome: 'invalid',
    occurredAt,
    message: 'Este código no es válido o la credencial fue regenerada.',
  }

  const parsed = parseQrToken(token)
  if (!parsed) return invalid

  const emp = (
    await db.query(
      `select e.id, e.code, e.full_name, e.document, e.position, e.status,
              c.status as credential_status, c.token_version
         from employees e
         join credentials c on c.employee_id = e.id
        where e.code = $1
          for update of e`,
      [parsed.code],
    )
  ).rows[0]
  if (!emp || !hasValidSignature(secret, parsed, emp.token_version)) return invalid

  const employee: ScanEmployee = {
    code: emp.code,
    fullName: emp.full_name,
    position: emp.position,
    document: emp.document,
    status: emp.status,
  }

  const record = (movement: Movement, result: 'autorizado' | 'denegado', reason: string | null) =>
    db.query(
      `insert into access_logs (employee_id, movement, result, reason, access_point_id, scanned_by, occurred_at)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [emp.id, movement, result, reason, point.id, scannerId, now],
    )

  const deny = async (reason: string): Promise<ScanResponse> => {
    await record('entrada', 'denegado', reason)
    return { outcome: 'denied', occurredAt, reason, employee }
  }

  if (isExpired(parsed, now.getTime())) return deny('Código QR vencido')
  if (emp.status !== 'activo' || emp.credential_status === 'inactiva') return deny('Credencial inactiva')
  if (emp.credential_status === 'por_revisar') return deny('Credencial por revisar')

  const last = (
    await db.query(
      `select movement, occurred_at
         from access_logs
        where employee_id = $1 and result = 'autorizado'
        order by occurred_at desc, id desc
        limit 1`,
      [emp.id],
    )
  ).rows[0]

  if (last) {
    const elapsed = now.getTime() - new Date(last.occurred_at).getTime()
    if (elapsed >= 0 && elapsed < DUPLICATE_WINDOW_MS) {
      return {
        outcome: 'authorized',
        occurredAt: new Date(last.occurred_at).toISOString(),
        movement: last.movement,
        duplicate: true,
        employee,
      }
    }
  }

  const movement: Movement = last?.movement === 'entrada' ? 'salida' : 'entrada'
  await record(movement, 'autorizado', null)
  await db.query('update employees set last_access_at = $2 where id = $1', [emp.id, now])
  return { outcome: 'authorized', occurredAt, movement, employee }
}
