import { useState, type FormEvent } from 'react'
import AuthCard from '../components/AuthCard'
import { useApi } from '../hooks/useApi'
import { api, ApiError } from '../lib/api'

export default function ForgotPassword() {
  const config = useApi<{ passwordReset: boolean }>('/api/auth/config')
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSending(true)
    setError(null)
    try {
      await api('/api/auth/forgot-password', { method: 'POST', body: { email } })
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  return (
    <AuthCard title="Recuperar contraseña" subtitle="Te enviaremos un enlace para crear una contraseña nueva.">
      {config.data && !config.data.passwordReset ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
          La recuperación por correo no está activada. Pide al administrador de tu organización que restablezca tu contraseña.
        </p>
      ) : sent ? (
        <p role="status" className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
          Si el correo está registrado, te enviamos un enlace para restablecer tu contraseña. Vale 30 minutos y solo se puede usar una vez. Revisa también la carpeta de correo no deseado.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="forgot-email" className="mb-1.5 block text-xs font-medium">
              Correo electrónico
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="username"
              className="input"
              placeholder="nombre@novatech.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={sending || !config.data} className="btn-primary h-11 w-full disabled:opacity-60">
            {sending ? 'Enviando…' : 'Enviar enlace'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
