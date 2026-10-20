import { pool } from '../db.js'
import { HttpError } from '../lib/http.js'
import { generatePassword, hashPassword } from '../lib/password.js'
import { emailAddress, passwordPolicy, str } from '../lib/validate.js'

/**
 * Crea un usuario administrador (para estrenar una base de datos de producción, donde no se usa db:seed).
 *   npm run admin:create -- correo@empresa.co "Nombre Apellido"
 * La contraseña sale de ADMIN_PASSWORD o, si no se define, se genera al azar y se muestra una sola vez.
 * (No se pasa por argumento para que no quede en el historial del terminal.)
 */
async function main() {
  const [emailArg, nameArg] = process.argv.slice(2)
  if (!emailArg || !nameArg) {
    console.error('Uso: create-admin <correo> "<Nombre completo>"   (opcional: ADMIN_PASSWORD en el entorno)')
    process.exitCode = 1
    return
  }

  const email = emailAddress(emailArg)
  const fullName = str(nameArg, 'nombre', { min: 3, max: 120 })
  const provided = process.env.ADMIN_PASSWORD
  const password = provided ? passwordPolicy(provided, email) : generatePassword()
  const hash = await hashPassword(password)

  const { rows } = await pool.query(
    `insert into users (email, password_hash, full_name, role)
     values ($1, $2, $3, 'admin')
     on conflict do nothing
     returning id`,
    [email, hash, fullName],
  )
  if (rows.length === 0) {
    console.error(`Ya existe un usuario con el correo ${email}.`)
    process.exitCode = 1
    return
  }

  console.log(`Administrador creado: ${fullName} <${email}>`)
  if (!provided) {
    console.log(`Contraseña inicial (se muestra solo ahora): ${password}`)
    console.log('Cámbiala al entrar desde "Cambiar contraseña".')
  }
}

main()
  .catch((error) => {
    console.error(error instanceof HttpError ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => pool.end())
