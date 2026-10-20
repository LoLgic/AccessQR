import { config } from '../config.js'
import { pool, tx, type Db } from '../db.js'
import { hashPassword } from '../lib/password.js'

/**
 * Datos de demostración del diseño de AccessQR (NovaTech Solutions).
 * ⚠ Borra TODO el contenido de las tablas antes de cargar. No se ejecuta en producción.
 */

if (config.isProduction) {
  console.error('db:seed está deshabilitado en producción.')
  process.exit(1)
}

const TOTAL_EMPLOYEES = 127
const HISTORY_DAYS = 30
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000 // Colombia no usa horario de verano (UTC-5)
const DAY_MS = 24 * 60 * 60 * 1000

type EmployeeStatus = 'activo' | 'inactivo'
type CredentialStatus = 'vigente' | 'inactiva' | 'por_revisar'

interface SeedEmployee {
  code: string | null // null → se toma de la secuencia
  fullName: string
  document: string
  position: string
  area: string
  status: EmployeeStatus
  credential: CredentialStatus
}

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const FIXED: SeedEmployee[] = [
  { code: 'NT-00127', fullName: 'Juan Pérez', document: '1002345678', position: 'Desarrollador Backend', area: 'Tecnología', status: 'activo', credential: 'vigente' },
  { code: 'NT-00126', fullName: 'Laura Gómez', document: '1045221904', position: 'Analista de Sistemas', area: 'Tecnología', status: 'activo', credential: 'vigente' },
  { code: 'NT-00125', fullName: 'Carlos Rodríguez', document: '1098776120', position: 'QA Engineer', area: 'Calidad', status: 'inactivo', credential: 'inactiva' },
  { code: 'NT-00001', fullName: 'María González', document: '1003998451', position: 'Administrador', area: 'Administración', status: 'activo', credential: 'vigente' },
  { code: 'NT-00124', fullName: 'Andrés Martínez', document: '1067120338', position: 'Diseñador UI/UX', area: 'Producto', status: 'activo', credential: 'por_revisar' },
  { code: 'NT-00123', fullName: 'Valentina Torres', document: '1011452890', position: 'QA Engineer', area: 'Calidad', status: 'activo', credential: 'vigente' },
]

const FIRST = ['Santiago', 'Sofía', 'Mateo', 'Valeria', 'Sebastián', 'Camila', 'Daniel', 'Isabella', 'Alejandro', 'Mariana', 'Samuel', 'Daniela', 'David', 'Luciana', 'Nicolás', 'Gabriela', 'Felipe', 'Natalia', 'Julián', 'Paula', 'Esteban', 'Carolina', 'Camilo', 'Andrea', 'Tomás', 'Juliana', 'Diego', 'Manuela', 'Jorge', 'Mónica']
const LAST = ['Ramírez', 'Castro', 'Vargas', 'Herrera', 'Moreno', 'Jiménez', 'Ortiz', 'Rojas', 'Mendoza', 'Ríos', 'Aguirre', 'Cárdenas', 'Suárez', 'Navarro', 'Cortés', 'Salazar', 'Pineda', 'Arias', 'Posada', 'Londoño', 'Giraldo', 'Bermúdez', 'Quintero', 'Escobar', 'Medina', 'Padilla', 'Peña', 'Zapata']
const POSITIONS: [string, string][] = [
  ['Desarrollador Backend', 'Tecnología'],
  ['Desarrollador Frontend', 'Tecnología'],
  ['Analista de Sistemas', 'Tecnología'],
  ['QA Engineer', 'Calidad'],
  ['Analista de Calidad', 'Calidad'],
  ['Diseñador UI/UX', 'Producto'],
  ['Product Owner', 'Producto'],
  ['Analista de Talento', 'Recursos Humanos'],
  ['Contador', 'Finanzas'],
  ['Auxiliar Administrativo', 'Administración'],
  ['Coordinador de Operaciones', 'Operaciones'],
  ['Asesor Comercial', 'Comercial'],
]

/** 127 empleados: 9 inactivos y 3 con credencial por revisar (como en el dashboard del diseño). */
function buildEmployees(): SeedEmployee[] {
  const generated = Array.from({ length: TOTAL_EMPLOYEES - FIXED.length }, (_, k): SeedEmployee => {
    const i = k + FIXED.length
    const inactive = i % 15 === 4
    const review = i === 40 || i === 100
    const [position, area] = POSITIONS[(i * 5 + 1) % POSITIONS.length]
    return {
      code: null,
      fullName: `${FIRST[i % FIRST.length]} ${LAST[(i + Math.floor(i / FIRST.length)) % LAST.length]}`,
      document: `1${String(((i + 1) * 104729) % 1_000_000_000).padStart(9, '0')}`,
      position,
      area,
      status: inactive ? 'inactivo' : 'activo',
      credential: inactive ? 'inactiva' : review ? 'por_revisar' : 'vigente',
    }
  })

  const all = [...FIXED, ...generated]
  if (new Set(all.map((e) => e.document)).size !== all.length) throw new Error('Documentos duplicados en el seed.')
  if (new Set(all.map((e) => e.fullName)).size !== all.length) throw new Error('Nombres duplicados en el seed.')
  return all
}

/** Medianoche de Bogotá (en UTC) de hace `offsetDays` días. */
function bogotaMidnight(nowMs: number, offsetDays: number): number {
  const wall = new Date(nowMs - BOGOTA_OFFSET_MS)
  const midnightUtc = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) + BOGOTA_OFFSET_MS
  return midnightUtc - offsetDays * DAY_MS
}

interface SeedEmployeeRow extends SeedEmployee {
  id: string
}

async function insertHistory(db: Db, employees: SeedEmployeeRow[], pointIds: Record<string, number>) {
  const rnd = rng(77)
  const nowMs = Date.now()

  const cols = {
    employee: [] as string[],
    movement: [] as string[],
    result: [] as string[],
    reason: [] as (string | null)[],
    point: [] as number[],
    at: [] as string[],
  }

  for (let offset = 0; offset < HISTORY_DAYS; offset++) {
    const midnight = bogotaMidnight(nowMs, offset)
    const weekday = new Date(midnight - BOGOTA_OFFSET_MS).getUTCDay() // 0 = domingo, 6 = sábado
    const events = weekday === 0 || weekday === 6 ? 8 : 70

    for (let k = 0; k < events; k++) {
      const minutes = 7 * 60 + 30 + Math.floor(rnd() * 630) // entre 07:30 y 18:00
      const at = midnight + minutes * 60_000
      if (at > nowMs) continue // nada en el futuro

      const employee = employees[Math.floor(rnd() * employees.length)]
      const blocked = employee.status === 'inactivo' || employee.credential === 'por_revisar'
      const hour = Math.floor(minutes / 60)
      const lean = rnd() < 0.88
      const movement = blocked
        ? 'entrada'
        : hour < 12
          ? lean ? 'entrada' : 'salida'
          : hour >= 15
            ? lean ? 'salida' : 'entrada'
            : rnd() < 0.5 ? 'entrada' : 'salida'
      const point = rnd() < 0.8 ? 'Portería principal' : 'Acceso administrativo'

      cols.employee.push(employee.id)
      cols.movement.push(movement)
      cols.result.push(blocked ? 'denegado' : 'autorizado')
      cols.reason.push(blocked ? (employee.status === 'inactivo' ? 'Credencial inactiva' : 'Credencial por revisar') : null)
      cols.point.push(pointIds[point])
      cols.at.push(new Date(at).toISOString())
    }
  }

  await db.query(
    `insert into access_logs (employee_id, movement, result, reason, access_point_id, occurred_at)
     select * from unnest($1::uuid[], $2::movement_type[], $3::access_result[], $4::text[], $5::int[], $6::timestamptz[])`,
    [cols.employee, cols.movement, cols.result, cols.reason, cols.point, cols.at],
  )
  await db.query(
    `update employees e
        set last_access_at = (select max(l.occurred_at) from access_logs l where l.employee_id = e.id and l.result = 'autorizado')`,
  )
  return cols.employee.length
}

async function main() {
  const password = process.env.SEED_PASSWORD ?? 'AccessQR-demo-2026!'
  const passwordHash = await hashPassword(password)
  const employees = buildEmployees()

  const summary = await tx(async (db) => {
    await db.query(
      'truncate access_logs, sessions, users, credentials, employees, areas restart identity cascade',
    )
    await db.query(`select setval('employee_code_seq', 1000, false)`)

    const areaNames = [...new Set(employees.map((e) => e.area))]
    const areaIds: Record<string, number> = {}
    for (const name of areaNames) {
      areaIds[name] = (await db.query('insert into areas (name) values ($1) returning id', [name])).rows[0].id
    }

    const points = (await db.query('select id, name from access_points')).rows as { id: number; name: string }[]
    const pointIds = Object.fromEntries(points.map((p) => [p.name, p.id]))

    const rows: SeedEmployeeRow[] = []
    for (const e of employees) {
      const code = e.code ?? (await db.query(`select 'NT-' || lpad(nextval('employee_code_seq')::text, 5, '0') as code`)).rows[0].code
      const id = (
        await db.query(
          `insert into employees (code, full_name, document, position, area_id, status)
           values ($1, $2, $3, $4, $5, $6) returning id`,
          [code, e.fullName, e.document, e.position, areaIds[e.area], e.status],
        )
      ).rows[0].id
      await db.query('insert into credentials (employee_id, status) values ($1, $2)', [id, e.credential])
      rows.push({ ...e, code, id })
    }

    const byName = (name: string) => rows.find((r) => r.fullName === name)!.id
    const users: [string, string, string, string][] = [
      ['maria.gonzalez@novatech.co', 'María González', 'admin', byName('María González')],
      ['andres.martinez@novatech.co', 'Andrés Martínez', 'control_acceso', byName('Andrés Martínez')],
      ['juan.perez@novatech.co', 'Juan Pérez', 'empleado', byName('Juan Pérez')],
    ]
    for (const [email, fullName, role, employeeId] of users) {
      await db.query(
        'insert into users (email, password_hash, full_name, role, employee_id) values ($1, $2, $3, $4::user_role, $5)',
        [email, passwordHash, fullName, role, employeeId],
      )
    }

    const logs = await insertHistory(db, rows, pointIds)
    return { employees: rows.length, logs, users: users.map((u) => `${u[0]} (${u[2]})`) }
  })

  console.log(`Seed listo: ${summary.employees} empleados, ${summary.logs} accesos.`)
  console.log('Usuarios de demostración (misma contraseña, definida en SEED_PASSWORD):')
  for (const user of summary.users) console.log(`  · ${user}`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
