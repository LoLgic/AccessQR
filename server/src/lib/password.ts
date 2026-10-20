import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { passwordPolicy } from './validate.js'

// scrypt (incluido en Node): sin dependencias nativas. Formato: scrypt$N$r$p$sal$hash
const N = 2 ** 16
const R = 8
const P = 1
const KEY_LENGTH = 64
const MAX_MEM = 256 * 1024 * 1024

function derive(password: string, salt: Buffer, n: number, r: number, p: number, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, length, { N: n, r, p, maxmem: MAX_MEM }, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await derive(password, salt, N, R, P, KEY_LENGTH)
  return ['scrypt', N, R, P, salt.toString('base64'), key.toString('base64')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const [n, r, p] = [Number(parts[1]), Number(parts[2]), Number(parts[3])]
  if (![n, r, p].every((v) => Number.isInteger(v) && v > 0)) return false
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  const actual = await derive(password, salt, n, r, p, expected.length)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

// Hash de relleno: permite gastar el mismo tiempo cuando el correo no existe (evita revelar qué correos están registrados).
let dummy: Promise<string> | undefined
export function dummyVerify(password: string): Promise<boolean> {
  dummy ??= hashPassword('relleno-para-igualar-tiempos')
  return dummy.then((hash) => verifyPassword(password, hash)).then(() => false)
}

/** Contraseña aleatoria de 24 caracteres que cumple la política (letras y números). */
export function generatePassword(): string {
  for (;;) {
    const candidate = randomBytes(18).toString('base64url')
    try {
      return passwordPolicy(candidate)
    } catch {
      // sin dígito o sin letra: se sortea otra
    }
  }
}
