import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthCard from '../components/AuthCard'
import { api, ApiError } from '../lib/api'

export default function ResetPassword() {
  const { search } = useLocation()
  const token = new URLSearchParams(search).get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: { token, password } })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  if (!token) {
    return (
      <AuthCard title="Enlace no válido">
        <p className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700">
          Este enlace está incompleto. Solicita uno nuevo desde <Link to="/recuperar" className="font-semibold underline">Recuperar contraseña</Link>.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Crea tu nueva contraseña" subtitle="Mínimo 10 caracteres, con letras y números.">
      {done ? (
        <div role="status" className="space-y-4">
          <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
            Listo, tu contraseña se actualizó y se cerraron tus sesiones abiertas.
          </p>
          <Link to="/login" className="btn-primary h-11 w-full">
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reset-password" className="mb-1.5 block text-xs font-medium">
              Nueva contraseña
            </label>
            <input id="reset-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
          </div>
          <div>
            <label htmlFor="reset-confirm" className="mb-1.5 block text-xs font-medium">
              Confirmar nueva contraseña
            </label>
            <input id="reset-confirm" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
              {error}{' '}
              {error.includes('enlace') && (
                <Link to="/recuperar" className="font-semibold underline">
                  Solicitar uno nuevo
                </Link>
              )}
            </p>
          )}

          <button type="submit" disabled={saving} className="btn-primary h-11 w-full disabled:opacity-60">
            {saving ? 'Guardando…' : 'Restablecer contraseña'}
          </button>
        </form>
      )}
    </AuthCard>
  )
}
