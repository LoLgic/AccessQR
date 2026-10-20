/**
 * Prueba de integración: levanta la API real sobre PostgreSQL, corre las migraciones y el seed reales
 * y recorre los flujos de cada rol. Verifica que el SQL y las reglas de negocio funcionan de verdad.
 *
 *   TEST_DATABASE_URL=postgres://accessqr:accessqr@localhost:5432/accessqr_test npm run test:integration
 *
 * ⚠ BORRA todo el contenido de esa base. Por seguridad, su nombre debe contener "test".
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { after, before, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const dbUrl = process.env.TEST_DATABASE_URL
const PASSWORD = 'Test-Pass-12345'
const SECRET = process.env.QR_SECRET ?? 'integration-secret-integration-secret-0123'

class Client {
  cookie = ''
  constructor(private base: string) {}

  async call(method: string, url: string, body?: unknown) {
    const response = await fetch(this.base + url, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    for (const header of response.headers.getSetCookie()) {
      const pair = header.split(';')[0]
      if (pair.startsWith('aq_session=')) this.cookie = pair.endsWith('=') ? '' : pair
    }
    const text = await response.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = null
    }
    return { status: response.status, json, text, headers: response.headers }
  }

  get(url: string) { return this.call('GET', url) }
  post(url: string, body?: unknown) { return this.call('POST', url, body ?? {}) }
  patch(url: string, body: unknown) { return this.call('PATCH', url, body) }
  del(url: string) { return this.call('DELETE', url) }

  async login(email: string, password = PASSWORD) {
    return this.post('/api/auth/login', { email, password })
  }
}

describe('integración con PostgreSQL', { skip: dbUrl ? false : 'Define TEST_DATABASE_URL para ejecutarla.' }, () => {
  let base = ''
  let server: { close(cb?: () => void): void; address(): unknown }
  let pool: { end(): Promise<void> }
  let issueQrToken: typeof import('../../src/lib/qrToken.js').issueQrToken
  let mailer: typeof import('../../src/lib/mailer.js')

  const newClient = () => new Client(base)
  let admin: Client

  // Sesiones reutilizadas por correo: el login tiene un límite de intentos y no hace falta repetirlo en cada prueba.
  const sessions = new Map<string, Client>()
  const as = async (email: string): Promise<Client> => {
    let client = sessions.get(email)
    if (!client) {
      client = newClient()
      assert.equal((await client.login(email)).status, 200, `no se pudo iniciar sesión como ${email}`)
      sessions.set(email, client)
    }
    return client
  }

  before(async () => {
    const dbName = new URL(dbUrl!).pathname.slice(1)
    assert.match(dbName, /test/i, `TEST_DATABASE_URL debe apuntar a una base con "test" en el nombre (es "${dbName}").`)

    process.env.DATABASE_URL = dbUrl
    process.env.QR_SECRET = SECRET
    process.env.SEED_PASSWORD = PASSWORD
    process.env.NODE_ENV = 'test'
    process.env.MAIL_TRANSPORT = 'memory' // los correos quedan en memoria para poder leerlos

    const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
    const pg = (await import('pg')).default
    const reset = new pg.Pool({ connectionString: dbUrl })
    await reset.query('drop schema public cascade')
    await reset.query('create schema public')
    await reset.end()

    for (const script of ['src/scripts/migrate.ts', 'src/scripts/seed.ts']) {
      try {
        execFileSync(process.execPath, ['--import', 'tsx', script], { cwd: serverDir, env: process.env, stdio: 'pipe' })
      } catch (error) {
        const e = error as { stderr?: Buffer; stdout?: Buffer }
        assert.fail(`Falló ${script}:\n${e.stderr?.toString() ?? ''}${e.stdout?.toString() ?? ''}`)
      }
    }

    ;({ issueQrToken } = await import('../../src/lib/qrToken.js'))
    mailer = await import('../../src/lib/mailer.js')
    const { createApp } = await import('../../src/app.js')
    const db = await import('../../src/db.js')
    pool = db.pool
    await new Promise<void>((resolve) => {
      server = createApp().listen(0, () => resolve())
    })
    const address = server.address() as { port: number }
    base = `http://127.0.0.1:${address.port}`
  })

  after(async () => {
    await new Promise<void>((resolve) => server?.close(() => resolve()))
    await pool?.end()
  })

  /* ---------- sesión ---------- */
  it('la API responde y la base de datos está accesible', async () => {
    const r = await newClient().get('/api/health')
    assert.equal(r.status, 200)
    assert.equal(r.json.ok, true)
  })

  it('login: rechaza datos incorrectos y acepta los del administrador', async () => {
    const c = newClient()
    assert.equal((await c.get('/api/auth/me')).status, 401)
    assert.equal((await c.login('maria.gonzalez@novatech.co', 'incorrecta-123')).status, 401)
    assert.equal((await c.login('nadie@novatech.co')).status, 401)

    admin = newClient()
    const ok = await admin.login('maria.gonzalez@novatech.co')
    assert.equal(ok.status, 200)
    assert.equal(ok.json.user.role, 'admin')
    const me = await admin.get('/api/auth/me')
    assert.equal(me.status, 200)
    assert.equal(me.json.user.email, 'maria.gonzalez@novatech.co')
  })

  it('cada rol solo accede a lo suyo', async () => {
    const guard = await as('andres.martinez@novatech.co')
    const worker = await as('juan.perez@novatech.co')

    assert.equal((await guard.get('/api/employees')).status, 403)
    assert.equal((await guard.get('/api/users')).status, 403)
    assert.equal((await guard.get('/api/access-logs')).status, 200)
    assert.equal((await guard.post('/api/access-points', { name: 'X' })).status, 403)
    assert.equal((await worker.get('/api/employees')).status, 403)
    assert.equal((await worker.get('/api/access-logs')).status, 403)
    assert.equal((await worker.post('/api/scan', { token: 'x' })).status, 403)
    assert.equal((await newClient().get('/api/employees')).status, 401)
  })

  /* ---------- dashboards y reportes ---------- */
  it('dashboard del administrador: cifras coherentes', async () => {
    const r = await admin.get('/api/dashboard/admin')
    assert.equal(r.status, 200)
    const { totals, weekly, today } = r.json
    assert.equal(totals.employees, 127)
    assert.equal(totals.inactive, 9)
    assert.equal(totals.active + totals.inactive, totals.employees)
    assert.equal(totals.credentialsToReview, 3)
    assert.equal(weekly.length, 7)
    assert.ok(today.entries >= 0 && today.exits >= 0)
    assert.ok(r.json.recent.length <= 4)
  })

  it('dashboard de portería', async () => {
    const guard = await as('andres.martinez@novatech.co')
    const r = await guard.get('/api/dashboard/gate')
    assert.equal(r.status, 200)
    assert.ok('entries' in r.json.today && 'denied' in r.json.today)
  })


  /* ---------- empleados ---------- */
  it('empleados: lista, filtros, búsqueda y orden en el servidor', async () => {
    const all = await admin.get('/api/employees?pageSize=100')
    assert.equal(all.status, 200)
    assert.equal(all.json.total, 127)
    assert.equal(all.json.data.length, 100)

    const page = await admin.get('/api/employees')
    assert.equal(page.json.data.length, 10)
    assert.equal(page.json.pageSize, 10)

    assert.equal((await admin.get('/api/employees?status=inactivo')).json.total, 9)
    assert.equal((await admin.get('/api/employees?credential=por_revisar')).json.total, 3)
    assert.ok((await admin.get('/api/employees?area=Calidad')).json.total > 0)
    assert.equal((await admin.get('/api/employees?status=borrado')).status, 400)

    const byName = await admin.get('/api/employees?q=mar%C3%ADa')
    assert.ok(byName.json.data.some((e: { fullName: string }) => e.fullName === 'María González'))
    const unaccented = await admin.get('/api/employees?q=maria')
    assert.ok(unaccented.json.data.some((e: { fullName: string }) => e.fullName === 'María González'), 'la búsqueda ignora tildes')
    const byDoc = await admin.get('/api/employees?q=1002345678')
    assert.equal(byDoc.json.data[0].fullName, 'Juan Pérez')

    const asc = await admin.get('/api/employees?sort=name&dir=asc&pageSize=5')
    const desc = await admin.get('/api/employees?sort=name&dir=desc&pageSize=5')
    assert.equal(asc.status, 200)
    assert.notEqual(asc.json.data[0].id, desc.json.data[0].id, 'asc y desc empiezan en empleados distintos')
    const ascAgain = await admin.get('/api/employees?sort=name&dir=asc&pageSize=5')
    assert.deepEqual(ascAgain.json.data.map((e: { id: string }) => e.id), asc.json.data.map((e: { id: string }) => e.id), 'el orden es estable')
    assert.equal((await admin.get('/api/employees?sort=password_hash')).status, 200, 'una columna fuera de la lista se ignora')

    const filters = await admin.get('/api/employees/filters')
    assert.ok(filters.json.areas.includes('Calidad'))
    assert.ok(filters.json.positions.includes('QA Engineer'))
  })

  it('empleados: crear, editar, inactivar y regenerar credencial', async () => {
    const created = await admin.post('/api/employees', { fullName: 'Pedro Prueba', document: '1.234.567.890', position: 'Tester', area: 'Calidad' })
    assert.equal(created.status, 201)
    assert.match(created.json.code, /^NT-\d{5}$/)
    assert.equal(created.json.document, '1234567890')
    assert.equal(created.json.credentialStatus, 'vigente')
    const id = created.json.id

    assert.equal((await admin.post('/api/employees', { fullName: 'Otro Pedro', document: '1234567890', position: 'T', area: 'Calidad' })).status, 409)
    assert.equal((await admin.post('/api/employees', { fullName: 'X', document: '12', position: 'T', area: 'Calidad' })).status, 400)

    const edited = await admin.patch(`/api/employees/${id}`, { position: 'Líder de pruebas', area: 'Área Nueva' })
    assert.equal(edited.status, 200)
    assert.equal(edited.json.area, 'Área Nueva')

    const off = await admin.patch(`/api/employees/${id}`, { status: 'inactivo' })
    assert.equal(off.json.credentialStatus, 'inactiva')
    assert.equal((await admin.post(`/api/employees/${id}/credential/rotate`)).status, 409)

    const on = await admin.patch(`/api/employees/${id}`, { status: 'activo' })
    assert.equal(on.json.credentialStatus, 'vigente')
    assert.equal((await admin.post(`/api/employees/${id}/credential/rotate`)).status, 200)
    assert.equal((await admin.patch(`/api/employees/${id}/credential`, { status: 'por_revisar' })).json.credentialStatus, 'por_revisar')
    assert.equal((await admin.patch(`/api/employees/${id}`, {})).status, 400)
    assert.equal((await admin.get('/api/employees/no-es-uuid')).status, 400)
    assert.equal((await admin.get('/api/employees/00000000-0000-4000-8000-000000000000')).status, 404)
    assert.equal((await admin.get('/api/employees?q=Pedro+Prueba')).json.total, 1)
  })

  /* ---------- QR y escaneo ---------- */
  it('carnet: el empleado recibe un QR firmado y el guardia lo valida', async () => {
    const worker = await as('juan.perez@novatech.co')
    const guard = await as('andres.martinez@novatech.co')

    const card = await worker.get('/api/me/card')
    assert.equal(card.status, 200)
    assert.equal(card.json.employee.code, 'NT-00127')
    assert.match(card.json.qr.token, /^aq1\.NT-00127\.\d+\./)
    assert.equal(card.json.qr.ttlSeconds, 120)

    const first = await guard.post('/api/scan', { token: card.json.qr.token })
    assert.equal(first.status, 200)
    assert.equal(first.json.outcome, 'authorized')
    assert.ok(['entrada', 'salida'].includes(first.json.movement))
    assert.equal(first.json.employee.fullName, 'Juan Pérez')

    const again = await guard.post('/api/scan', { token: card.json.qr.token })
    assert.equal(again.json.duplicate, true, 'la segunda lectura inmediata no crea otro registro')
    assert.equal(again.json.movement, first.json.movement)

    const mine = await worker.get('/api/me/access-logs?limit=5')
    assert.equal(mine.json.data[0].result, 'autorizado')
    assert.equal(mine.json.data[0].movement, first.json.movement)

    const tampered = card.json.qr.token.replace(/\.[^.]+$/, '.AAAAAAAAAAAAAAAAAAAAAA')
    assert.equal((await guard.post('/api/scan', { token: tampered })).json.outcome, 'invalid')
    assert.equal((await guard.post('/api/scan', { token: 'hola' })).json.outcome, 'invalid')
    assert.equal((await guard.post('/api/scan', { token: card.json.qr.token, accessPoint: 'No existe' })).status, 400)
  })

  it('escaneo: denegados con su motivo, quedan registrados', async () => {
    const guard = await as('andres.martinez@novatech.co')
    const forge = (code: string, version = 1, at = Date.now()) => issueQrToken(SECRET, code, version, 120, at).token

    const inactive = await guard.post('/api/scan', { token: forge('NT-00125') }) // Carlos: inactivo
    assert.equal(inactive.json.outcome, 'denied')
    assert.equal(inactive.json.reason, 'Credencial inactiva')

    const expired = await guard.post('/api/scan', { token: forge('NT-00126', 1, Date.now() - 10 * 60_000) })
    assert.equal(expired.json.outcome, 'denied')
    assert.equal(expired.json.reason, 'Código QR vencido')

    const review = await guard.post('/api/scan', { token: forge('NT-00124') }) // Andrés: por revisar
    assert.equal(review.json.reason, 'Credencial por revisar')

    assert.equal((await guard.post('/api/scan', { token: forge('NT-00126', 2) })).json.outcome, 'invalid', 'versión de credencial distinta')

    const denied = await admin.get('/api/access-logs?result=denegado&pageSize=100')
    assert.ok(denied.json.data.length > 0)
    assert.ok(denied.json.data.every((r: { reason: string | null }) => r.reason), 'todo denegado tiene motivo')
    const carlos = await admin.get('/api/access-logs?q=Carlos&result=denegado')
    assert.ok(carlos.json.data.some((r: { reason: string }) => r.reason === 'Credencial inactiva'))
  })

  it('al regenerar la credencial, el QR anterior deja de valer', async () => {
    const worker = await as('juan.perez@novatech.co')
    const guard = await as('andres.martinez@novatech.co')
    const oldToken = (await worker.get('/api/me/card')).json.qr.token
    const juan = (await admin.get('/api/employees?q=1002345678')).json.data[0]
    assert.equal(juan.code, 'NT-00127')
    assert.equal((await admin.post(`/api/employees/${juan.id}/credential/rotate`)).status, 200)
    assert.equal((await guard.post('/api/scan', { token: oldToken })).json.outcome, 'invalid')
    const fresh = (await worker.get('/api/me/card')).json.qr.token
    assert.equal((await guard.post('/api/scan', { token: fresh })).json.outcome, 'authorized')
  })



  /* ---------- usuarios y contraseñas ---------- */
  it('usuarios: alta, validaciones, salvaguardas y restablecimiento', async () => {
    const list = await admin.get('/api/users')
    assert.equal(list.json.total, 3)
    const me = (await admin.get('/api/auth/me')).json.user

    assert.equal((await admin.post('/api/users', { fullName: 'Nuevo Guardia', email: 'guardia2@novatech.co', role: 'control_acceso', password: 'corta1' })).status, 400)
    assert.equal((await admin.post('/api/users', { fullName: 'Sin Carnet', email: 'sincarnet@novatech.co', role: 'empleado', password: 'Clave-segura-123' })).status, 400)

    const created = await admin.post('/api/users', { fullName: 'Nuevo Guardia', email: 'Guardia2@Novatech.co', role: 'control_acceso', password: 'Clave-segura-123' })
    assert.equal(created.status, 201)
    assert.equal(created.json.email, 'guardia2@novatech.co')
    assert.equal((await admin.post('/api/users', { fullName: 'Repetido', email: 'guardia2@novatech.co', role: 'control_acceso', password: 'Clave-segura-123' })).status, 409)

    const linkable = await admin.get('/api/users/linkable-employees')
    assert.ok(linkable.json.data.length > 0)
    const linked = await admin.post('/api/users', { fullName: 'Valentina Torres', email: 'valentina@novatech.co', role: 'empleado', password: 'Clave-segura-123', employeeId: linkable.json.data[0].id })
    assert.equal(linked.status, 201)
    assert.equal((await admin.post('/api/users', { fullName: 'Otro', email: 'otro@novatech.co', role: 'empleado', password: 'Clave-segura-123', employeeId: linkable.json.data[0].id })).status, 409, 'un empleado solo puede tener un usuario')

    // salvaguardas del administrador
    assert.equal((await admin.patch(`/api/users/${me.id}`, { role: 'control_acceso' })).status, 409)
    assert.equal((await admin.patch(`/api/users/${me.id}`, { isActive: false })).status, 409)
    assert.equal((await admin.post(`/api/users/${me.id}/password`, { password: 'Otra-clave-1234' })).status, 400)

    // restablecer clave: la nueva sirve, la anterior no, y se cierran sus sesiones
    const guard = newClient()
    assert.equal((await guard.login('guardia2@novatech.co', 'Clave-segura-123')).status, 200)
    assert.equal((await guard.get('/api/auth/me')).status, 200)
    assert.equal((await admin.post(`/api/users/${created.json.id}/password`, { password: 'Clave-nueva-4567' })).status, 204)
    assert.equal((await guard.get('/api/auth/me')).status, 401, 'la sesión abierta se cerró')
    assert.equal((await newClient().login('guardia2@novatech.co', 'Clave-segura-123')).status, 401)
    assert.equal((await newClient().login('guardia2@novatech.co', 'Clave-nueva-4567')).status, 200)

    // desactivar: ya no puede entrar
    assert.equal((await admin.patch(`/api/users/${created.json.id}`, { isActive: false })).json.isActive, false)
    assert.equal((await newClient().login('guardia2@novatech.co', 'Clave-nueva-4567')).status, 401)

    const filtered = await admin.get('/api/users?role=control_acceso&active=false')
    assert.equal(filtered.json.total, 1)
  })

  it('salvaguardas entre administradores', async () => {
    const second = await admin.post('/api/users', { fullName: 'Segundo Admin', email: 'admin2@novatech.co', role: 'admin', password: 'Clave-segura-123' })
    assert.equal(second.status, 201)
    const other = newClient(); await other.login('admin2@novatech.co', 'Clave-segura-123')
    const me = (await admin.get('/api/auth/me')).json.user

    // el segundo admin degrada a María: permitido (él sigue siendo admin) …
    assert.equal((await other.patch(`/api/users/${me.id}`, { role: 'control_acceso' })).status, 200)
    // … y ahora, siendo el único administrador, no puede degradarse ni desactivarse a sí mismo
    assert.equal((await other.patch(`/api/users/${second.json.id}`, { role: 'control_acceso' })).status, 409)
    assert.equal((await other.patch(`/api/users/${second.json.id}`, { isActive: false })).status, 409)
    // devolver el rol a María para no afectar otras pruebas
    assert.equal((await other.patch(`/api/users/${me.id}`, { role: 'admin' })).status, 200)
  })

  it('cambiar la propia contraseña', async () => {
    const guard = newClient(); await guard.login('andres.martinez@novatech.co')
    const second = newClient(); await second.login('andres.martinez@novatech.co')

    assert.equal((await guard.post('/api/auth/change-password', { currentPassword: 'incorrecta-123', newPassword: 'Nueva-clave-9999' })).status, 400)
    assert.equal((await guard.post('/api/auth/change-password', { currentPassword: PASSWORD, newPassword: 'corta' })).status, 400)
    assert.equal((await guard.post('/api/auth/change-password', { currentPassword: PASSWORD, newPassword: PASSWORD })).status, 400)
    assert.equal((await guard.post('/api/auth/change-password', { currentPassword: PASSWORD, newPassword: 'Nueva-clave-9999' })).status, 204)

    assert.equal((await guard.get('/api/auth/me')).status, 200, 'la sesión actual se conserva')
    assert.equal((await second.get('/api/auth/me')).status, 401, 'las demás sesiones se cierran')
    assert.equal((await newClient().login('andres.martinez@novatech.co')).status, 401)
    assert.equal((await newClient().login('andres.martinez@novatech.co', 'Nueva-clave-9999')).status, 200)
  })

  /* ---------- recuperación de contraseña por correo ---------- */
  it('recuperación de contraseña: enlace de un solo uso, con vencimiento, sin revelar correos', async () => {
    const anon = newClient()
    assert.equal((await anon.get('/api/auth/config')).json.passwordReset, true)

    const email = 'recupera@novatech.co'
    const created = await admin.post('/api/users', { fullName: 'Usuario Recupera', email, role: 'control_acceso', password: 'Clave-inicial-123' })
    assert.equal(created.status, 201)

    const waitForMail = async (count: number) => {
      for (let i = 0; i < 30 && mailer.outbox.length < count; i++) await new Promise((r) => setTimeout(r, 100))
      return mailer.outbox.length >= count
    }
    const tokenIn = (text: string) => /token=([A-Za-z0-9_-]+)/.exec(text)![1]
    const sent = mailer.outbox.length

    // correo desconocido: misma respuesta y ningún correo; correo mal escrito: 400
    assert.equal((await anon.post('/api/auth/forgot-password', { email: 'nadie@novatech.co' })).status, 202)
    await new Promise((r) => setTimeout(r, 400))
    assert.equal(mailer.outbox.length, sent, 'no se envía correo a quien no existe')
    assert.equal((await anon.post('/api/auth/forgot-password', { email: 'no-es-correo' })).status, 400)

    // correo conocido
    assert.equal((await anon.post('/api/auth/forgot-password', { email })).status, 202)
    assert.ok(await waitForMail(sent + 1), 'debería haberse enviado el correo')
    const mail = mailer.outbox[mailer.outbox.length - 1]
    assert.equal(mail.to, email)
    assert.match(mail.text, /\/restablecer\?token=/)
    const token = tokenIn(mail.text)

    const open = newClient()
    assert.equal((await open.login(email, 'Clave-inicial-123')).status, 200)

    assert.equal((await anon.post('/api/auth/reset-password', { token: 'inventado', password: 'Clave-nueva-4567' })).status, 400)
    assert.equal((await anon.post('/api/auth/reset-password', { token, password: 'corta1' })).status, 400, 'contraseña débil')
    assert.equal((await anon.post('/api/auth/reset-password', { token, password: 'Clave-nueva-4567' })).status, 204, 'la contraseña débil no consumió el enlace')
    assert.equal((await anon.post('/api/auth/reset-password', { token, password: 'Otra-clave-98765' })).status, 400, 'el enlace sirve una sola vez')

    assert.equal((await open.get('/api/auth/me')).status, 401, 'las sesiones abiertas se cerraron')
    assert.equal((await newClient().login(email, 'Clave-inicial-123')).status, 401)
    assert.equal((await newClient().login(email, 'Clave-nueva-4567')).status, 200)

    // enlace vencido
    assert.equal((await anon.post('/api/auth/forgot-password', { email })).status, 202)
    assert.ok(await waitForMail(sent + 2))
    const expiredToken = tokenIn(mailer.outbox[mailer.outbox.length - 1].text)
    const { pool: db } = await import('../../src/db.js')
    await db.query(`update password_resets set expires_at = now() - interval '1 minute'`)
    assert.equal((await anon.post('/api/auth/reset-password', { token: expiredToken, password: 'Clave-final-123456' })).status, 400)
  })

  /* ---------- puntos de acceso ---------- */
  it('puntos de acceso: alta, renombrar y reglas de borrado', async () => {
    const list = await admin.get('/api/access-points')
    assert.equal(list.status, 200)
    const withLogs = list.json.data.find((p: { accessCount: number }) => p.accessCount > 0)
    assert.ok(withLogs, 'el seed crea accesos en los puntos')

    const created = await admin.post('/api/access-points', { name: 'Portería norte' })
    assert.equal(created.status, 201)
    assert.equal((await admin.post('/api/access-points', { name: 'Portería norte' })).status, 409)
    assert.equal((await admin.patch(`/api/access-points/${created.json.id}`, { name: 'Portería sur' })).json.name, 'Portería sur')

    // se puede escanear en el punto nuevo
    const guard = newClient()
    assert.equal((await guard.login('andres.martinez@novatech.co', 'Nueva-clave-9999')).status, 200)
    const laura = issueQrToken(SECRET, 'NT-00126', 1, 120).token
    const scan = await guard.post('/api/scan', { token: laura, accessPoint: 'Portería sur' })
    assert.equal(scan.json.outcome, 'authorized')
    assert.ok(!scan.json.duplicate, 'debe crear un registro nuevo en el punto')

    assert.equal((await admin.del(`/api/access-points/${withLogs.id}`)).status, 409, 'con accesos no se borra')
    assert.equal((await admin.del(`/api/access-points/${created.json.id}`)).status, 409, 'el nuevo ya tiene un acceso')
    const spare = await admin.post('/api/access-points', { name: 'Punto temporal' })
    assert.equal((await admin.del(`/api/access-points/${spare.json.id}`)).status, 204)
    assert.equal((await admin.del('/api/access-points/999999')).status, 404)
  })

  it('configuración del sistema', async () => {
    const r = await admin.get('/api/settings')
    assert.equal(r.status, 200)
    assert.equal(r.json.qrTtlSeconds, 120)
    assert.equal(r.json.duplicateWindowSeconds, 10)
  })

  /* ---------- cierre de sesión ---------- */
  it('logout invalida la sesión', async () => {
    const c = newClient(); await c.login('juan.perez@novatech.co')
    assert.equal((await c.get('/api/me/card')).status, 200)
    assert.equal((await c.post('/api/auth/logout')).status, 204)
    assert.equal((await c.get('/api/me/card')).status, 401)
  })
})
