import { useState } from 'react'
import Modal from '../app/Modal'
import { api, ApiError } from '../../lib/api'
import { credentialLabel } from '../../lib/labels'
import type { EmployeeRow } from '../../lib/types'

interface Props {
  employee: EmployeeRow
  onClose: () => void
  onChanged: () => void
}

export default function CredentialModal({ employee, onClose, onChanged }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inactive = employee.status === 'inactivo'

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la acción.')
      setBusy(false)
    }
  }

  const rotate = () => {
    if (!window.confirm('Se invalidarán los códigos QR actuales de este empleado. ¿Continuar?')) return
    void run(() => api(`/api/employees/${employee.id}/credential/rotate`, { method: 'POST' }))
  }

  const setStatus = (status: 'vigente' | 'por_revisar') =>
    void run(() => api(`/api/employees/${employee.id}/credential`, { method: 'PATCH', body: { status } }))

  return (
    <Modal title="Credencial digital" onClose={onClose}>
      <p className="mt-4 text-sm">
        <span className="font-semibold">{employee.fullName}</span>
        <span className="text-muted"> · {employee.code}</span>
      </p>
      <p className="mt-1 text-sm text-muted">
        Estado actual: <span className="font-semibold text-ink dark:text-slate-100">{credentialLabel[employee.credentialStatus]}</span>
      </p>

      {inactive ? (
        <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          El empleado está inactivo. Actívalo desde “Editar” para volver a habilitar su credencial.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          <div>
            <button type="button" onClick={rotate} disabled={busy} className="btn-primary w-full disabled:opacity-60">
              Regenerar credencial
            </button>
            <p className="mt-1.5 text-xs text-muted">Invalida los QR anteriores. Úsalo si el celular se perdió o se compartió el código.</p>
          </div>
          {employee.credentialStatus === 'por_revisar' ? (
            <button type="button" onClick={() => setStatus('vigente')} disabled={busy} className="btn-outline w-full disabled:opacity-60">
              Marcar como vigente
            </button>
          ) : (
            <button type="button" onClick={() => setStatus('por_revisar')} disabled={busy} className="btn-outline w-full disabled:opacity-60">
              Marcar por revisar
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="btn-outline">
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
