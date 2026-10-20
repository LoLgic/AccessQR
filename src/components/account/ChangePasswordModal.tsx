import { useState, type FormEvent } from 'react'
import Modal from '../app/Modal'
import { api, ApiError } from '../../lib/api'

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (next !== confirm) {
      setError('La confirmación no coincide con la nueva contraseña.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next } })
      setDone(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Cambiar contraseña" onClose={onClose}>
      {done ? (
        <>
          <p role="status" className="mt-5 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800 dark:bg-green-500/15 dark:text-green-400">
            Listo, tu contraseña se actualizó. Las demás sesiones abiertas de tu cuenta se cerraron.
          </p>
          <div className="mt-5 flex justify-end">
            <button type="button" onClick={onClose} className="btn-primary">
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="pw-current" className="mb-1.5 block text-xs font-medium">
              Contraseña actual
            </label>
            <input id="pw-current" type="password" autoComplete="current-password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="pw-new" className="mb-1.5 block text-xs font-medium">
              Nueva contraseña
            </label>
            <input id="pw-new" type="password" autoComplete="new-password" className="input" value={next} onChange={(e) => setNext(e.target.value)} required minLength={10} />
            <p className="mt-1.5 text-xs text-muted">Mínimo 10 caracteres, con letras y números.</p>
          </div>
          <div>
            <label htmlFor="pw-confirm" className="mb-1.5 block text-xs font-medium">
              Confirmar nueva contraseña
            </label>
            <input id="pw-confirm" type="password" autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
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
              {saving ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
