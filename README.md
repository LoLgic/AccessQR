# AccessQR

Control de acceso empresarial con carnets digitales y códigos QR (proyecto académico · CUN Montería).

| Capa | Tecnología |
| --- | --- |
| Front | Vite · React 18 · TypeScript · Tailwind CSS · React Router |
| API | Node 20+ · Express 4 · TypeScript (`server/`) |
| Base de datos | **PostgreSQL 16** (SQL plano, sin ORM) |

## Puesta en marcha

Necesitas **Node 20 o superior** y **PostgreSQL** (lo más fácil: Docker).

```bash
# 1. Dependencias del front y del servidor
npm run setup

# 2. Base de datos (Docker). Si ya tienes Postgres, crea la base y ajusta DATABASE_URL en server/.env
npm run db:up

# 3. Variables de entorno
cp server/.env.example server/.env        # Windows: copy server\.env.example server\.env

# 4. Tablas y datos de demostración
npm run db:migrate
npm run db:seed

# 5. Dos terminales
npm run dev:server     # API en http://localhost:3001
npm run dev            # Front en http://localhost:5173
```

Abre <http://localhost:5173/login>. Todos los usuarios de demostración usan la clave de `SEED_PASSWORD` (por defecto `AccessQR-demo-2026!`):

| Rol | Correo | Entra a |
| --- | --- | --- |
| Administrador | `maria.gonzalez@novatech.co` | `/app` (dashboard, empleados, credenciales, historial, reportes, usuarios, configuración) |
| Control de acceso | `andres.martinez@novatech.co` | `/porteria` y el escáner `/m/escaner` |
| Empleado | `juan.perez@novatech.co` | `/m/inicio` (carnet, QR, historial; también cambia su clave y cierra sesión) |

> `npm run db:seed` **borra todos los datos** y vuelve a cargar los de demostración (127 empleados, ~1.600 accesos de los últimos 30 días). No corre con `NODE_ENV=production`.

## Cómo funciona el QR

1. El carnet del empleado pide `GET /api/me/card`. El servidor responde con un código **firmado y de corta vida**:
   `aq1.<código de empleado>.<expira>.<firma>` (HMAC-SHA256 con `QR_SECRET`). El carnet lo renueva solo antes de vencer (`QR_TTL_SECONDS`, 120 s por defecto), así que una captura de pantalla deja de servir en minutos.
2. El escáner (`/m/escaner`) lee el QR con la cámara y lo envía a `POST /api/scan`.
3. El servidor valida la firma, la vigencia y el estado del empleado y de su credencial, **y registra el resultado** en `access_logs` dentro de una transacción (el empleado se bloquea con `FOR UPDATE`, así que dos lecturas simultáneas no se pisan). Alterna entrada y salida; una segunda lectura en menos de 10 s no crea otro registro.
4. Al **regenerar la credencial** de un empleado (o reactivarlo) sube su `token_version` y todos sus QR anteriores dejan de valer.

Regla de acceso: entra solo quien está **Activo** y con credencial **Vigente**. Los demás intentos quedan registrados como *Denegado* con su motivo.

La cámara del navegador solo funciona en `localhost` o con **HTTPS**. Si pruebas desde el celular por la IP de tu red, usa un túnel HTTPS (por ejemplo `ngrok`) o el campo "Ingresar el código a mano" del escáner (el código se copia desde *Mi QR*).

## Estructura

```
src/                  Front
  auth/               Sesión (AuthProvider) y rutas por rol (RequireRole)
  pages/              Landing, Login, Dashboard, Porteria, Employees, History, mobile/*
  hooks/              useApi, useListState, useQrScanner, useCard…
  lib/                api.ts (fetch), tipos, formatos
server/
  migrations/         001_init.sql (esquema)  ← agrega aquí 002_… para cambios futuros
  src/routes/         auth, employees, users, accessLogs, scan, dashboard, reports, accessPoints, settings, me
  src/services/       scan.ts (decisión de acceso)
  src/lib/            qrToken, password (scrypt), validate, csv, rateLimit, mailer
  src/scripts/        migrate.ts, seed.ts, create-admin.ts
  test/               Pruebas unitarias; test/integration/ = integración con PostgreSQL
docker-compose.yml    PostgreSQL 16 para desarrollo
Dockerfile            Imagen de producción (API + front)
render.yaml           Blueprint de Render: base de datos + aplicación (despliegue automático)
.github/workflows/    ci.yml (pruebas en cada push y pull request)
DEPLOY.md             Guía de despliegue en Render
```

## API (resumen)

Todas las rutas van bajo `/api` y usan una cookie de sesión `httpOnly`.

| Método y ruta | Rol | Qué hace |
| --- | --- | --- |
| `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | — | Sesión |
| `GET /employees` (`q`, `status`, `area`, `position`, `sort`, `dir`, `page`) | admin | Lista paginada en el servidor |
| `POST /employees`, `PATCH /employees/:id` | admin | Crear y editar (incluye activar/inactivar) |
| `POST /employees/:id/credential/rotate`, `PATCH /employees/:id/credential` | admin | Regenerar / marcar por revisar |
| `GET /access-logs`, `GET /access-logs/export.csv` | admin, control | Historial con filtros y exportación |
| `POST /scan` | admin, control | Valida un QR y registra el acceso |
| `GET /dashboard/admin`, `GET /dashboard/gate` | admin / control | Contadores y gráfico |
| `GET /users`, `POST /users`, `PATCH /users/:id` | admin | Listar, crear y editar usuarios (rol, activo) |
| `POST /users/:id/password`, `GET /users/linkable-employees` | admin | Restablecer clave de otra persona; empleados sin usuario |
| `POST /auth/change-password` | cualquiera | Cambiar la propia contraseña |
| `GET /reports/summary`, `GET /reports/daily.csv` (`from`, `to`) | admin | Reporte por rango: totales, por día, por área, por hora y motivos de denegación |
| `GET /access-points` (admin, control), `POST` / `PATCH /:id` / `DELETE /:id` (admin) | — | Puntos de acceso |
| `GET /settings` | admin | Parámetros del sistema (solo lectura) |
| `GET /me/card`, `GET /me/access-logs` | cualquiera con carnet | Carnet con QR vigente e historial propio |

## Usuarios y contraseñas

- **Usuarios y roles** (`/app/usuarios-y-roles`, solo administrador): crear usuarios, cambiar rol o estado y restablecer la contraseña de otra persona. El rol *Empleado* exige vincular al usuario con un empleado (así obtiene su carnet).
- **Política de contraseña:** mínimo 10 caracteres, con letras y números y distinta del correo.
- Desactivar un usuario o restablecer su contraseña **cierra sus sesiones abiertas**. Cambiar la propia contraseña cierra las demás sesiones y conserva la actual.
- Salvaguardas: nadie puede desactivarse ni quitarse el rol de administrador a sí mismo, y siempre debe quedar al menos un administrador activo (los administradores se bloquean con `FOR UPDATE` para que dos cambios simultáneos no lo violen).
- **Recuperación por correo** (opcional): si configuras un servidor SMTP, el login muestra «Recuperar contraseña» y envía un enlace de un solo uso que vale 30 minutos (`/recuperar` → correo → `/restablecer`). Sin SMTP la función queda desactivada y el administrador restablece la clave desde *Usuarios y roles*.

## Pruebas

```bash
npm test                     # unitarias del servidor (no necesitan base de datos): QR firmado, validaciones, SQL, escaneo
npm run test:integration     # integración contra PostgreSQL real (ver abajo)
```

La **prueba de integración** es la forma de comprobar que el SQL, las migraciones y el seed funcionan en tu máquina: levanta la API completa, corre `db:migrate` y `db:seed` y recorre los flujos de los tres roles (login, empleados, escaneo y QR, historial, reportes, usuarios y contraseñas, puntos de acceso).

```bash
docker compose up -d                                              # si la base de desarrollo no está arriba
docker compose exec db createdb -U accessqr accessqr_test         # una sola vez
TEST_DATABASE_URL=postgres://accessqr:accessqr@localhost:5432/accessqr_test npm run test:integration
# Windows (PowerShell):  $env:TEST_DATABASE_URL="postgres://accessqr:accessqr@localhost:5432/accessqr_test"; npm run test:integration
```

> ⚠ Esa base se **borra y se recrea** en cada ejecución. Por seguridad, la prueba se niega a correr si el nombre de la base no contiene `test`. Sin `TEST_DATABASE_URL` las pruebas de integración se omiten.

El flujo de GitHub Actions (`.github/workflows/ci.yml`) ejecuta todo esto en cada *push* y *pull request*: compila el front y, en el servidor, comprueba tipos, corre las pruebas unitarias y las de integración con un PostgreSQL real.

### Activar la recuperación por correo

Define en `server/.env` (en Render, en *Environment* del servicio) los datos de tu proveedor de correo:

```
APP_URL=https://tu-dominio                 # base de los enlaces del correo
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587                              # 465 con SMTP_SECURE=true
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=AccessQR <no-reply@tu-empresa.co>
```

- La respuesta es la misma exista o no el correo, y el envío ocurre después de responder, para no revelar qué correos están registrados. Hay un límite de 5 solicitudes por IP cada 15 minutos.
- Solo se guarda el **hash** del enlace; pedir uno nuevo invalida el anterior. Si la contraseña nueva no cumple la política, el enlace no se consume. Al restablecer se cierran todas las sesiones de esa cuenta.
- El token viaja en la URL del enlace, por lo que puede quedar en los registros de acceso del servidor web; vence en 30 minutos y es de un solo uso.
- Para probar sin un servidor de correo real, las pruebas usan `MAIL_TRANSPORT=memory` (solo permitido fuera de producción).

## Seguridad

- Contraseñas con **scrypt** (N=2¹⁶); sesiones en la tabla `sessions` guardando solo el **hash** del token; cookie `httpOnly` + `SameSite=Lax` (+ `Secure` en producción) y comprobación de `Origin` en peticiones que modifican datos.
- Límite de 10 intentos de login por IP + correo cada 15 minutos (en memoria).
- Todas las consultas van parametrizadas; el orden de las tablas usa una lista blanca de columnas.
- El CSV neutraliza celdas que empiezan por `=`, `+`, `-` o `@`.
- Los intentos denegados también se auditan y los registros de acceso no se borran al eliminar datos relacionados.

## Despliegue en producción (Render)

La aplicación se publica en [Render](https://render.com): subes el código a GitHub y Render construye el `Dockerfile` y lo publica solo, con HTTPS automático (que además es lo que permite usar la **cámara** desde cualquier celular). No hay servidor propio, SSH ni proxy que mantener.

```
git push a main ──► GitHub Actions (CI) ──► si pasa ──► Render construye y publica
```

1. Sube el proyecto a GitHub.
2. En Render: **New → Blueprint**, conecta el repositorio y pulsa **Apply**. [`render.yaml`](render.yaml) crea la base PostgreSQL 16 y el servicio web.
3. Crea el primer administrador desde tu computador (la base de producción arranca vacía; `db:seed` está bloqueado a propósito):

```bash
cd server
DATABASE_URL="<External Database URL>?sslmode=no-verify" QR_SECRET="cualquier-texto-de-32-caracteres-o-mas" \
  npm run admin:create -- correo@tuempresa.co "Nombre Apellido"
```

Guía completa (permitir tu IP en la base, PowerShell, SMTP, dominio propio, respaldos y solución de problemas) en **[DEPLOY.md](DEPLOY.md)**.

Detalles útiles:

- Las migraciones corren solas al arrancar (con candado en la base, así que es seguro reiniciar).
- El servidor se niega a arrancar con el `QR_SECRET` de ejemplo y activa la cookie `Secure` (`NODE_ENV=production`), por eso **hay que usar HTTPS**; Render ya lo da en `https://…onrender.com`.
- **Plan gratuito:** el servicio se duerme tras ~15 minutos sin tráfico y la base de datos se elimina a los 30 días y no tiene respaldos. Sirve para una demo; para uso real usa un plan de pago de la base (cambia `plan: free` en `render.yaml`).
- Probar la imagen de producción en tu máquina: `docker build -t accessqr .` y ejecútala con `DATABASE_URL`, `QR_SECRET` y `NODE_ENV=development` (en `production` la cookie `Secure` no funciona por `http://`).
- Sin `package-lock.json` el Dockerfile usa `npm install`; tras el primer `npm run setup` conviene subir los `package-lock.json` (raíz y `server/`) para que las construcciones sean reproducibles.
- Zona horaria de "hoy", filtro por fecha y CSV: `APP_TIME_ZONE` (por defecto `America/Bogota`).

## Pendiente / límites conocidos

- No hay invitaciones por correo: el administrador define la clave inicial. La recuperación por correo existe pero hay que activarla con SMTP (ver arriba); no se probó contra un servidor de correo real.
- El limitador de intentos vive en memoria: con varias instancias del servidor habría que moverlo a Redis o a una tabla.
- *Reportes*, *Configuración*, *Usuarios y roles* y la vista de *Credenciales* no tenían diseño en el PDF: se construyeron con el mismo estilo del resto. *Credenciales* abre *Empleados* filtrado por credenciales «Por revisar» (la gestión se hace desde ahí). *Configuración* permite administrar los puntos de acceso; sus parámetros (vigencia del QR, zona horaria…) son de solo lectura y se cambian con variables de entorno.
- En el carnet, *Compartir* y *Descargar* están deshabilitados a propósito (el QR caduca en minutos, así que compartirlo o guardarlo como imagen no sirve); *Detalles* sí funciona. La campana de notificaciones es solo visual.
- El SQL, el `Dockerfile` y `render.yaml` se escribieron sin poder ejecutarlos (el entorno de desarrollo del asistente no tiene PostgreSQL ni Docker). Por eso existe la prueba de integración: córrela primero (`npm run test:integration`) y te dirá exactamente qué falla, si algo falla.
- No se añadió una política de contenido (CSP) ni HSTS: conviene evaluarlas en el navegador antes de activarlas.
