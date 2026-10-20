// Pruebas de la lógica del servidor que no necesitan base de datos.  Ejecutar:  npm test
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

process.env.DATABASE_URL ??= 'postgres://x:x@localhost:5432/x'
process.env.QR_SECRET = 'test-secret-test-secret-test-secret-0123'
process.env.MAIL_TRANSPORT = 'memory'
const SECRET = process.env.QR_SECRET

const { issueQrToken, parseQrToken, hasValidSignature, isExpired } = await import('../src/lib/qrToken.js')
const { hashPassword, verifyPassword, dummyVerify, generatePassword } = await import('../src/lib/password.js')
const v = await import('../src/lib/validate.js')
const { csvCell, toCsv } = await import('../src/lib/csv.js')
const { employeeWhere } = await import('../src/routes/employees.js')
const { logWhere } = await import('../src/routes/accessLogs.js')
const { processScan, DUPLICATE_WINDOW_MS } = await import('../src/services/scan.js')
const { resolveRange, MAX_RANGE_DAYS } = await import('../src/routes/reports.js')
const mailer = await import('../src/lib/mailer.js')

describe('QR firmado', () => {
  const now = Date.UTC(2026, 9, 16, 15, 0, 0)
  const { token, expiresAt } = issueQrToken(SECRET, 'NT-00127', 3, 120, now)
  const parsed = parseQrToken(token)!

  it('tiene el formato esperado y es corto', () => {
    assert.match(token, /^aq1\.NT-00127\.\d+\.[A-Za-z0-9_-]+$/)
    assert.equal(expiresAt.getTime(), now + 120_000)
    assert.ok(token.length < 60)
  })
  it('valida solo con el secreto y la versión correctos', () => {
    assert.ok(hasValidSignature(SECRET, parsed, 3))
    assert.ok(!hasValidSignature(SECRET, parsed, 4))
    assert.ok(!hasValidSignature('otro-secreto-otro-secreto-otro-secreto-1', parsed, 3))
  })
  it('detecta datos alterados', () => {
    assert.ok(!hasValidSignature(SECRET, { ...parsed, code: 'NT-00126' }, 3))
    assert.ok(!hasValidSignature(SECRET, { ...parsed, exp: parsed.exp + 9999 }, 3))
  })
  it('vence a los 120 s', () => {
    assert.ok(!isExpired(parsed, now + 119_000))
    assert.ok(isExpired(parsed, now + 120_000))
  })
  it('rechaza textos mal formados', () => {
    for (const bad of ['', 'hola', 'accessqr:NT-00127', 'aq1.NT-00127.123', 'aq1.nt-1.123.abc', 'aq1.NT-00127.abc.sig', 'aq2.NT-00127.123.sig', 'aq1.NT-00127.123.sig.extra']) {
      assert.equal(parseQrToken(bad), null, bad)
    }
  })
})

describe('contraseñas', () => {
  it('verifica la correcta y rechaza las demás', async () => {
    const hash = await hashPassword('Clave-123!')
    assert.match(hash, /^scrypt\$65536\$8\$1\$/)
    assert.ok(await verifyPassword('Clave-123!', hash))
    assert.ok(!(await verifyPassword('clave-123!', hash)))
    assert.ok(!(await verifyPassword('x', 'basura')))
    assert.equal(await dummyVerify('lo-que-sea'), false)
  })
})

describe('contraseña inicial aleatoria', () => {
  it('siempre cumple la política y no se repite', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const pw = generatePassword()
      assert.equal(pw.length, 24)
      assert.doesNotThrow(() => v.passwordPolicy(pw))
      seen.add(pw)
    }
    assert.equal(seen.size, 300)
  })
})

describe('validadores', () => {
  it('documentos', () => {
    assert.equal(v.documentNumber('1.002.345.678'), '1002345678')
    assert.throws(() => v.documentNumber('12'), /identificación/)
    assert.throws(() => v.documentNumber('abc12345'), /identificación/)
  })
  it('fechas', () => {
    assert.equal(v.isoDate('2026-10-16'), '2026-10-16')
    assert.equal(v.isoDate(undefined), undefined)
    assert.throws(() => v.isoDate('2026-02-31'), /AAAA-MM-DD/)
    assert.throws(() => v.isoDate("2026-01-01'; drop table x;--"), /AAAA-MM-DD/)
  })
  it('paginación y LIKE', () => {
    assert.deepEqual(v.paging({ page: '3', pageSize: '500' }, 10, 100), { page: 3, pageSize: 100, offset: 200 })
    assert.deepEqual(v.paging({ page: '-4', pageSize: 'x' }, 10, 100), { page: 1, pageSize: 10, offset: 0 })
    assert.equal(v.likePattern('50%_a\\b'), '%50\\%\\_a\\\\b%')
  })
  it('ORDER BY solo con columnas de la lista blanca', () => {
    const cols = { name: 'e.full_name' }
    assert.equal(v.orderBy({ sort: 'name', dir: 'desc' }, cols, 'x', 'e.id'), 'order by e.full_name desc nulls last, e.id')
    assert.equal(v.orderBy({ sort: 'name; drop table users' }, cols, 'x asc', 'e.id'), 'order by x asc')
    assert.equal(v.orderBy({ sort: 'constructor' }, cols, 'x asc', 'e.id'), 'order by x asc')
  })
})

describe('usuarios y contraseñas', () => {
  it('correo: normaliza y rechaza formatos inválidos', () => {
    assert.equal(v.emailAddress('  Maria.Gonzalez@NovaTech.co '), 'maria.gonzalez@novatech.co')
    for (const bad of ['', 'sin-arroba', 'a@b', 'a b@c.co', 42]) assert.throws(() => v.emailAddress(bad), /correo|obligatorio/)
  })
  it('política de contraseña', () => {
    assert.equal(v.passwordPolicy('Clave-segura-2026'), 'Clave-segura-2026')
    assert.throws(() => v.passwordPolicy('corta1'), /10 caracteres/)
    assert.throws(() => v.passwordPolicy('solo-letras-largas'), /letras y números/)
    assert.throws(() => v.passwordPolicy('12345678901234'), /letras y números/)
    assert.doesNotThrow(() => v.passwordPolicy('juan.perez@novatech.co1'))
  })
  it('no permite usar el correo como contraseña', () => {
    assert.throws(() => v.passwordPolicy('Juan.Perez1@x.co', 'juan.perez1@x.co'), /igual al correo/)
  })
  it('conserva los espacios de la contraseña (no hace trim)', () => {
    assert.equal(v.passwordPolicy('  con espacios 123  '), '  con espacios 123  ')
  })
})

describe('rango de reportes', () => {
  it('por defecto: últimos 30 días hasta hoy', () => {
    assert.deepEqual(resolveRange({}, '2026-10-16'), { from: '2026-09-17', to: '2026-10-16' })
  })
  it('respeta fechas indicadas y cruza meses y años', () => {
    assert.deepEqual(resolveRange({ from: '2026-01-01', to: '2026-01-31' }, '2026-10-16'), { from: '2026-01-01', to: '2026-01-31' })
    assert.deepEqual(resolveRange({ to: '2026-01-10' }, '2026-10-16'), { from: '2025-12-12', to: '2026-01-10' })
  })
  it('un solo día es válido', () => {
    assert.deepEqual(resolveRange({ from: '2026-10-16', to: '2026-10-16' }, '2026-10-16'), { from: '2026-10-16', to: '2026-10-16' })
  })
  it('rechaza rango invertido, demasiado largo o fechas inválidas', () => {
    assert.throws(() => resolveRange({ from: '2026-10-16', to: '2026-10-15' }, '2026-10-16'), /posterior/)
    assert.throws(() => resolveRange({ from: '2024-01-01', to: '2026-10-16' }, '2026-10-16'), new RegExp(String(MAX_RANGE_DAYS)))
    assert.throws(() => resolveRange({ from: '2026-02-31' }, '2026-10-16'), /AAAA-MM-DD/)
  })
  it('acepta exactamente el máximo de días', () => {
    assert.doesNotThrow(() => resolveRange({ from: '2025-10-16', to: '2026-10-16' }, '2026-10-16'))
  })
})

describe('correo', () => {
  it('con MAIL_TRANSPORT=memory el correo queda en el buzón de pruebas', async () => {
    assert.equal(mailer.mailerEnabled(), true)
    await mailer.sendMail({ to: 'a@b.co', subject: 'Hola', text: 'texto' })
    assert.equal(mailer.outbox.length, 1)
    assert.equal(mailer.outbox[0].to, 'a@b.co')
  })
  it('escapa HTML en los datos del usuario', () => {
    assert.equal(mailer.escapeHtml(`<img src=x onerror="alert('x')">&`), '&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;')
  })
})

describe('CSV', () => {
  it('neutraliza fórmulas y escapa comillas', () => {
    assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`)
    assert.equal(csvCell('Ana "la" Gómez'), '"Ana ""la"" Gómez"')
    assert.equal(csvCell(null), '""')
    assert.ok(toCsv([['a', 'b']]).startsWith('\uFEFF"a","b"'))
  })
})

describe('constructores de SQL', () => {
  function check(where: string, params: unknown[]) {
    const used = [...where.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]))
    assert.equal(used.length ? Math.max(...used) : 0, params.length, 'placeholders ≠ parámetros')
    for (let i = 1; i <= params.length; i++) assert.ok(used.includes(i), `falta $${i}`)
    assert.ok(!/drop table|--/i.test(where), 'el texto del usuario no debe aparecer en el SQL')
  }

  it('empleados', () => {
    let p: unknown[] = []
    assert.equal(employeeWhere({}, p), '')
    p = []; check(employeeWhere({ q: 'maría' }, p), p); assert.deepEqual(p, ['%maría%'])
    p = []; check(employeeWhere({ q: '1.002' }, p), p); assert.deepEqual(p, ['%1.002%', '%1002%'])
    p = []; check(employeeWhere({ q: "x'; drop table users;--", status: 'inactivo', area: 'Calidad', position: 'QA', credential: 'por_revisar' }, p), p)
    assert.equal(p.length, 5)
    assert.throws(() => employeeWhere({ status: 'borrado' }, []), /uno de/)
  })
  it('historial', () => {
    const p: unknown[] = []
    check(logWhere({ q: 'juan', date: '2026-10-06', movement: 'entrada', result: 'denegado' }, p), p)
    assert.deepEqual(p.slice(1, 3), ['America/Bogota', '2026-10-06'])
    assert.throws(() => logWhere({ date: '06/10/2026' }, []), /AAAA-MM-DD/)
  })
})

describe('servicio de escaneo (base simulada)', () => {
  interface Emp { id: string; code: string; full_name: string; document: string; position: string; status: string; credential_status: string; token_version: number }
  const base = (o: Partial<Emp> & { code: string }): Emp => ({ id: 'id-' + o.code, full_name: 'Nombre ' + o.code, document: '1000000000', position: 'Cargo', status: 'activo', credential_status: 'vigente', token_version: 1, ...o })

  function fakeDb(employees: Emp[]) {
    const logs: { employee_id: string; movement: string; result: string; reason: string | null }[] = []
    const updates: unknown[][] = []
    return {
      logs, updates,
      async query(text: string, params: unknown[] = []) {
        if (text.includes('from access_points')) {
          const exists = text.includes('limit 1') || params[0] === 'Portería principal'
          return { rows: exists ? [{ id: 1 }] : [], rowCount: 0 }
        }
        if (text.includes('from employees e')) return { rows: employees.filter((e) => e.code === params[0]), rowCount: 0 }
        if (text.includes('insert into access_logs')) { logs.push({ employee_id: params[0] as string, movement: params[1] as string, result: params[2] as string, reason: params[3] as string | null }); return { rows: [], rowCount: 1 } }
        if (text.includes('from access_logs')) {
          const mine = logs.filter((l) => l.employee_id === params[0] && l.result === 'autorizado')
          return { rows: mine.length ? [{ movement: mine[mine.length - 1].movement, occurred_at: lastAt.get(params[0] as string) }] : [], rowCount: 0 }
        }
        if (text.includes('update employees set last_access_at')) { updates.push(params); lastAt.set(params[0] as string, params[1] as Date); return { rows: [], rowCount: 1 } }
        throw new Error('consulta no prevista: ' + text.slice(0, 40))
      },
    }
  }
  const lastAt = new Map<string, Date>()

  const t0 = new Date('2026-10-16T15:00:00Z')
  const tok = (code: string, version = 1, at = t0) => issueQrToken(SECRET, code, version, 120, at.getTime()).token
  const run = (db: ReturnType<typeof fakeDb>, token: string, now = t0) =>
    processScan(db, { token, pointName: 'Portería principal', scannerId: 'guard', secret: SECRET, now })

  it('rechaza un punto de acceso inexistente', async () => {
    const db = fakeDb([base({ code: 'NT-00001' })])
    await assert.rejects(processScan(db, { token: tok('NT-00001'), pointName: 'Sótano', scannerId: 'g', secret: SECRET, now: t0 }), /punto de acceso/)
  })

  it('sin punto indicado usa el primero', async () => {
    lastAt.clear()
    const db = fakeDb([base({ code: 'NT-00001' })])
    const r = await processScan(db, { token: tok('NT-00001'), scannerId: 'g', secret: SECRET, now: t0 })
    assert.equal(r.outcome, 'authorized')
  })

  it('los códigos inválidos no se registran', async () => {
    const db = fakeDb([base({ code: 'NT-00001' })])
    for (const bad of ['hola', tok('NT-99999'), 'aq1.NT-00001.9999999999.AAAAAAAAAAAAAAAAAAAAAA']) {
      assert.equal((await run(db, bad)).outcome, 'invalid')
    }
    assert.equal(db.logs.length, 0)
  })

  it('alterna entrada/salida y absorbe lecturas repetidas', async () => {
    lastAt.clear()
    const db = fakeDb([base({ code: 'NT-00001' })])
    let r = await run(db, tok('NT-00001'))
    assert.equal(r.outcome, 'authorized'); assert.equal(r.movement, 'entrada'); assert.ok(!r.duplicate)

    r = await run(db, tok('NT-00001'), new Date(t0.getTime() + 3000))
    assert.equal(r.duplicate, true); assert.equal(r.movement, 'entrada'); assert.equal(db.logs.length, 1)

    const t1 = new Date(t0.getTime() + DUPLICATE_WINDOW_MS + 1000)
    r = await run(db, tok('NT-00001', 1, t1), t1)
    assert.equal(r.movement, 'salida'); assert.equal(db.logs.length, 2)

    const t2 = new Date(t1.getTime() + 60_000)
    r = await run(db, tok('NT-00001', 1, t2), t2)
    assert.equal(r.movement, 'entrada')
  })

  it('un QR vencido se deniega y queda registrado', async () => {
    const db = fakeDb([base({ code: 'NT-00001' })])
    const r = await run(db, tok('NT-00001', 1, new Date(t0.getTime() - 10 * 60_000)))
    assert.equal(r.outcome, 'denied'); assert.equal(r.reason, 'Código QR vencido')
    assert.deepEqual(db.logs.map((l) => [l.result, l.reason]), [['denegado', 'Código QR vencido']])
  })

  it('deniega inactivos y credenciales por revisar, con su motivo', async () => {
    const db = fakeDb([
      base({ code: 'NT-00002', status: 'inactivo', credential_status: 'inactiva' }),
      base({ code: 'NT-00003', credential_status: 'por_revisar' }),
    ])
    let r = await run(db, tok('NT-00002')); assert.equal(r.outcome, 'denied'); assert.equal(r.reason, 'Credencial inactiva')
    r = await run(db, tok('NT-00003')); assert.equal(r.outcome, 'denied'); assert.equal(r.reason, 'Credencial por revisar'); assert.equal(r.employee?.code, 'NT-00003')
  })

  it('al regenerar la credencial, el QR anterior deja de valer', async () => {
    const db = fakeDb([base({ code: 'NT-00001', token_version: 2 })])
    let r = await run(db, tok('NT-00001', 1)); assert.equal(r.outcome, 'invalid'); assert.equal(db.logs.length, 0)
    r = await run(db, tok('NT-00001', 2)); assert.equal(r.outcome, 'authorized')
  })
})
