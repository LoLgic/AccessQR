import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CheckCircle2, Clock, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { useApi } from '../hooks/useApi'
import Logo from '../components/Logo'
import QrMock from '../components/QrMock'
import { ApiError } from '../lib/api'
import { homeFor } from '../lib/labels'

interface FormErrors {
  email?: string
  password?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {}
  if (!email.trim()) errors.email = 'Ingresa tu correo electrónico.'
  else if (!EMAIL_RE.test(email.trim())) errors.email = 'Escribe un correo válido, por ejemplo nombre@novatech.co.'
  if (!password) errors.password = 'Ingresa tu contraseña.'
  return errors
}

function Badge({ icon, label, className }: { icon: ReactNode; label: string; className: string }) {
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>
      {icon}
      {label}
    </span>
  )
}

function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between bg-ink p-14 text-white lg:flex">
      <Logo tone="light" />

      <div>
        <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight">
          Control de acceso empresarial, ahora digital.
        </h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-slate-300">
          Identifica, valida y controla el ingreso de tu equipo con carnets digitales y códigos QR únicos.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <figure className="w-48 rounded-2xl bg-white p-5 text-center shadow-card" aria-hidden="true">
            <QrMock seed={88} className="mx-auto h-32 w-32" />
            <figcaption className="mt-4 text-[11px] text-slate-500">Carnet de María González</figcaption>
          </figure>

          <div className="flex flex-col gap-2">
            <Badge className="bg-green-100 text-green-800" icon={<CheckCircle2 size={12} />} label="Acceso autorizado" />
            <Badge className="bg-brand-50 text-brand" icon={<ShieldCheck size={12} />} label="Credencial activa" />
            <Badge className="bg-slate-100 text-slate-700" icon={<Clock size={12} />} label="Entrada registrada 08:42" />
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400">© 2026 AccessQR · NovaTech Solutions (demo)</p>
    </aside>
  )
}

function inputWrapper(hasError: boolean) {
  return `flex h-11 items-center gap-2.5 rounded-lg border bg-white px-3 transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 ${
    hasError ? 'border-red-500' : 'border-slate-300'
  }`
}

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [recoverOpen, setRecoverOpen] = useState(false)
  const config = useApi<{ passwordReset: boolean }>('/api/auth/config')

  if (user) return <Navigate to={homeFor(user.role)} replace />

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const found = validate(email, password)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) return

    setSubmitting(true)
    try {
      const signedIn = await login(email.trim(), password, remember)
      navigate(homeFor(signedIn.role), { replace: true })
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.')
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />

      <main className="flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <Logo className="mb-8" />

          <h2 className="text-2xl font-semibold tracking-tight">Bienvenido de nuevo</h2>
          <p className="mt-1.5 text-sm text-slate-500">Ingresa con tu cuenta corporativa para continuar.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-7 space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium">
                Correo electrónico
              </label>
              <div className={inputWrapper(Boolean(errors.email))}>
                <Mail size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nombre@novatech.co"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
              </div>
              {errors.email && (
                <p id="email-error" role="alert" className="mt-1.5 text-xs text-red-600">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium">
                Contraseña
              </label>
              <div className={inputWrapper(Boolean(errors.password))}>
                <Lock size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showPassword}
                  className="shrink-0 rounded text-slate-500 hover:text-ink"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" role="alert" className="mt-1.5 text-xs text-red-600">
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand"
                />
                Recordarme
              </label>
              {config.data?.passwordReset ? (
                <Link to="/recuperar" className="text-xs font-semibold text-brand hover:text-brand-700">
                  Recuperar contraseña
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setRecoverOpen((v) => !v)}
                  aria-expanded={recoverOpen}
                  className="text-xs font-semibold text-brand hover:text-brand-700"
                >
                  Recuperar contraseña
                </button>
              )}
            </div>

            {recoverOpen && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                Por ahora, pide al administrador de tu organización que restablezca tu contraseña.
              </p>
            )}

            {serverError && (
              <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Ingresando…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-500">¿Necesitas ayuda? Contacta al administrador de tu organización.</p>

          <Link to="/" className="mt-8 inline-block text-xs font-medium text-slate-500 hover:text-ink">
            Volver al sitio
          </Link>
        </div>
      </main>
    </div>
  )
}
