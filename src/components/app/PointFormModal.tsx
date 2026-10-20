import { useState, type FormEvent } from 'react'
import Modal from './Modal'
import { api, ApiError } from '../../lib/api'
import type { AccessPoint } from '../../lib/types'

interface Props {
  point?: AccessPoint
  onClose: () => void
  onSaved: () => void
}

export default function PointFormModal({ point, onClose, onSaved }: Props) {
  const [name, setName] = useState(point?.name ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (point) await api(`/api/access-points/${point.id}`, { method: 'PATCH', body: { name } })
      else await api('/api/access-points', { method: 'POST', body: { name } })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el punto de acceso.')
      setSaving(false)
    }
  }

  return (
    <Modal title={point ? 'Renombrar punto de acceso' : 'Nuevo punto de acceso'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="point-name" className="mb-1.5 block text-xs font-medium">
            Nombre
          </label>
          <input id="point-name" className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} placeholder="Portería norte" />
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
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
