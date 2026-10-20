import { useState, type FormEvent } from 'react'
import Modal from '../app/Modal'
import { api, ApiError } from '../../lib/api'
import type { UserRow } from '../../lib/types'

export default function ResetPasswordModal({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api(`/api/users/${user.id}/password`, { method: 'POST', body: { password } })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo restablecer la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Restablecer contraseña" onClose={onClose}>
      <p className="mt-4 text-sm">
        <span className="font-semibold">{user.fullName}</span>
        <span className="text-muted"> · {user.email}</span>
      </p>

      {done ? (
        <>
          <p role="status" className="mt-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-500/15 dark:text-green-400">
            Contraseña actualizada. Sus sesiones abiertas se cerraron.
          </p>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onClose} className="btn-primary">
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="rst-password" className="mb-1.5 block text-xs font-medium">
              Nueva contraseña
            </label>
            <input id="rst-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
            <p className="mt-1.5 text-xs text-muted">Mínimo 10 caracteres, con letras y números. Compártela de forma segura.</p>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
              {saving ? 'Guardando…' : 'Restablecer'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
