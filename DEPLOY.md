# Despliegue en Render

```
git push a main ──► GitHub Actions (CI: tipos, pruebas, PostgreSQL real, imagen Docker)
                          │ si todo pasa
                          ▼
                   Render: construye el Dockerfile ─► arranca la app
                          │  (aplica las migraciones y espera /api/health)
                          ▼
                   https://accessqr-xxxx.onrender.com   (HTTPS automático)
```

- No hay servidor que mantener: sin SSH, sin Caddy, sin `docker compose` en producción.
- Las **migraciones** se aplican solas al arrancar la app.
- Render publica solo cuando **los chequeos de GitHub Actions pasan** (`autoDeployTrigger: checksPass` en `render.yaml`). Si un despliegue nuevo no pasa el health check, Render no lo activa y la versión anterior sigue sirviendo.
- Todo está descrito en [`render.yaml`](render.yaml) (Blueprint): la base de datos PostgreSQL 16 y la aplicación.

## 1. Primer despliegue (una sola vez)

1. Sube el proyecto a GitHub y crea una cuenta en [render.com](https://render.com) (puedes entrar con GitHub).
2. En Render: **New → Blueprint**, conecta el repositorio y elige la rama `main`.
3. Render muestra lo que va a crear: la base `accessqr-db` y el servicio web `accessqr`. Pulsa **Apply**.
4. Espera a que el servicio pase a **Live** (el primer build tarda unos minutos). La URL aparece arriba en el servicio.
5. Comprueba `https://TU-SERVICIO.onrender.com/api/health`: debe responder `{"ok":true}`.

`QR_SECRET` lo genera Render al azar y lo conserva entre despliegues. La base de datos y la app se hablan por la red interna de Render.

## 2. Crear el primer administrador

La base de producción nace vacía (`db:seed` está bloqueado a propósito con `NODE_ENV=production`) y el plan gratuito de Render no tiene consola dentro del servicio. Se hace **desde tu computador**, conectándote a la base por un momento:

1. En Render abre la base `accessqr-db` → **Networking / Access Control** y añade **tu IP pública** (búscala como «cuál es mi IP»). Por defecto la base no acepta conexiones desde Internet.
2. En la misma página copia la **External Database URL** y agrégale al final `?sslmode=no-verify`.
3. En tu computador, dentro de la carpeta del proyecto:

```bash
cd server
npm install        # si aún no lo hiciste

# Linux / macOS
DATABASE_URL="postgres://…?sslmode=no-verify" QR_SECRET="cualquier-texto-de-al-menos-32-caracteres" \
  npm run admin:create -- correo@tuempresa.co "Nombre Apellido"

# Windows (PowerShell)
$env:DATABASE_URL="postgres://…?sslmode=no-verify"
$env:QR_SECRET="cualquier-texto-de-al-menos-32-caracteres"
npm run admin:create -- correo@tuempresa.co "Nombre Apellido"
```

El `QR_SECRET` de este comando es solo para que el script arranque; no tiene que ser el de producción. Muestra una contraseña aleatoria **una sola vez** (o usa la tuya con `ADMIN_PASSWORD`): entra a tu URL de Render y cámbiala.

4. Cuando termines, **quita tu IP** de la lista de acceso de la base.

### Datos de demostración (opcional)

Si quieres los 127 empleados de ejemplo para una presentación, corre `npm run db:seed` en `server/` con las mismas variables de arriba (y sin `NODE_ENV=production`). **Borra todo lo que haya en la base** antes de cargarlos.

## 3. Desde ahora: solo `git push`

```bash
git add .
git commit -m "Cambio"
git push
```

GitHub Actions corre las pruebas y, si pasan, Render construye y publica. Puedes ver el avance en la pestaña **Events** del servicio, y los registros en **Logs**.

Para volver a una versión anterior: servicio → **Events** → el despliegue bueno → **Rollback**.

> Las migraciones solo avanzan. Si una versión nueva aplicó una migración y luego haces rollback, la versión vieja corre sobre el esquema nuevo. Por eso las migraciones deben ser **compatibles hacia atrás** (añadir columnas o tablas en vez de borrarlas o renombrarlas).

## 4. Variables de entorno

Las define `render.yaml`. Para cambiarlas o añadir otras: servicio → **Environment**.

| Variable | Valor en Render |
| --- | --- |
| `NODE_ENV` | `production` |
| `PORT` | `10000` (el puerto que Render espera) |
| `TRUST_PROXY` | `true` (Render termina el HTTPS delante de la app) |
| `DATABASE_URL` | la conexión interna de `accessqr-db`, la pone Render |
| `QR_SECRET` | generado por Render |
| `QR_TTL_SECONDS`, `APP_TIME_ZONE`, `COMPANY_NAME` | `120`, `America/Bogota`, `NovaTech Solutions` |
| `APP_URL` | *(opcional)* si no la defines, se usa la URL pública de Render; defínela si añades un dominio propio |

### Recuperación de contraseña por correo (opcional)

En **Environment** añade `SMTP_HOST`, `SMTP_PORT` (587; 465 con `SMTP_SECURE=true`), `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM` (por ejemplo `AccessQR <no-reply@tu-empresa.co>`). Render redespliega solo. Sin `SMTP_HOST` la función queda desactivada.

### Dominio propio (opcional)

Servicio → **Settings → Custom Domains**. Render emite el certificado HTTPS solo. Después define `APP_URL=https://tu-dominio`.

## 5. Plan gratuito: lo que debes saber

| Tema | Qué pasa |
| --- | --- |
| Servicio web | Se duerme tras ~15 minutos sin tráfico; la primera petición después tarda en responder (el escáner tendrá ese retraso). Tiene un límite mensual de horas. |
| Base de datos | **Se elimina a los 30 días de crearla** y no tiene respaldos. |
| Respaldos | Los respaldos automáticos y la recuperación a un punto en el tiempo requieren un plan de pago de la base. |

Para una demo o la sustentación sirve. Para uso real, sube la base (y el servicio) a un plan de pago cambiando `plan: free` en `render.yaml`.

**Respaldo manual** (con tu IP permitida y la External Database URL):

```bash
pg_dump -Fc "postgres://…?sslmode=require" -f respaldo.dump
# restaurar en otra base:  pg_restore -d "postgres://…" --no-owner respaldo.dump
```

## 6. Si algo falla

| Síntoma | Causa probable |
| --- | --- |
| El build falla | Mira **Logs → Build**. Suele ser un error de tipos del front o del servidor (CI también lo habría marcado). |
| «Deploy failed» tras compilar | Mira **Logs**: una migración que falla, o `QR_SECRET` con menos de 32 caracteres. |
| No se despliega al hacer push | CI está en rojo (`checksPass` espera a que pase), o la rama no es la conectada. |
| `/api/health` da error | La base aún no está lista o se eliminó (plan gratuito, 30 días). |
| No puedo iniciar sesión | Entra por `https://` (la cookie es `Secure`) y confirma que existe un administrador (paso 2). |
| `self-signed certificate` / SSL al correr `admin:create` | Falta `?sslmode=no-verify` en la External Database URL. |
| Timeout al conectar desde mi PC | Tu IP no está en la lista de acceso de la base (paso 2.1). |
