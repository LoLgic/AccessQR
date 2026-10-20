import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Formato del QR:  aq1.<código de empleado>.<expira (segundos unix)>.<firma>
 * La firma es HMAC-SHA256(secreto, "código.versión.expira") truncada a 128 bits.
 * La versión vive en la base de datos (credentials.token_version): al subirla, todos los QR anteriores dejan de valer.
 */
const PREFIX = 'aq1'
const SIGNATURE_BYTES = 16
const CODE_PATTERN = /^[A-Z0-9-]{3,20}$/

export interface ParsedQrToken {
  code: string
  exp: number
  signature: string
}

function sign(secret: string, code: string, version: number, exp: number): Buffer {
  return createHmac('sha256', secret).update(`${code}.${version}.${exp}`).digest().subarray(0, SIGNATURE_BYTES)
}

export function issueQrToken(
  secret: string,
  code: string,
  version: number,
  ttlSeconds: number,
  now: number = Date.now(),
): { token: string; expiresAt: Date } {
  const exp = Math.floor(now / 1000) + ttlSeconds
  const signature = sign(secret, code, version, exp).toString('base64url')
  return { token: `${PREFIX}.${code}.${exp}.${signature}`, expiresAt: new Date(exp * 1000) }
}

/** Solo revisa la forma del texto. La firma se comprueba después con hasValidSignature. */
export function parseQrToken(raw: string): ParsedQrToken | null {
  const parts = raw.trim().split('.')
  if (parts.length !== 4 || parts[0] !== PREFIX) return null
  const [, code, expText, signature] = parts
  if (!CODE_PATTERN.test(code) || !/^[0-9]{1,12}$/.test(expText) || !/^[A-Za-z0-9_-]+$/.test(signature)) return null
  return { code, exp: Number(expText), signature }
}

export function hasValidSignature(secret: string, parsed: ParsedQrToken, version: number): boolean {
  const expected = sign(secret, parsed.code, version, parsed.exp)
  const received = Buffer.from(parsed.signature, 'base64url')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export function isExpired(parsed: ParsedQrToken, now: number = Date.now()): boolean {
  return parsed.exp * 1000 <= now
}
