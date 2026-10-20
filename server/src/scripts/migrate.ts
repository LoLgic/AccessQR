import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from '../db.js'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations')

const LOCK_ID = 727274 // candado de aplicación: evita que dos contenedores migren a la vez

async function main() {
  const lock = await pool.connect()
  try {
    await lock.query('select pg_advisory_lock($1)', [LOCK_ID])
    await migrate()
  } finally {
    await lock.query('select pg_advisory_unlock($1)', [LOCK_ID]).catch(() => undefined)
    lock.release()
  }
}

async function migrate() {
  await pool.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )`)

  const applied = new Set((await pool.query('select name from schema_migrations')).rows.map((r: { name: string }) => r.name))
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()

  let count = 0
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(dir, file), 'utf8')
    const client = await pool.connect()
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations (name) values ($1)', [file])
      await client.query('commit')
      console.log(`✔ ${file}`)
      count++
    } catch (error) {
      await client.query('rollback').catch(() => undefined)
      throw new Error(`Falló la migración ${file}: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      client.release()
    }
  }
  console.log(count === 0 ? 'La base de datos ya está al día.' : `${count} migración(es) aplicada(s).`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
