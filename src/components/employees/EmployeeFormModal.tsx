import { useState, type FormEvent, type ReactNode } from 'react'
import Modal from '../app/Modal'
import { api, ApiError } from '../../lib/api'
import { formatDocument } from '../../lib/format'
import { employeeStatusLabel } from '../../lib/labels'
import type { EmployeeRow, EmployeeStatus } from '../../lib/types'

interface Props {
  employee?: EmployeeRow
  areas: string[]
  onClose: () => void
  onSaved: () => void
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children}
    </div>
  )
}

export default function EmployeeFormModal({ employee, areas, onClose, onSaved }: Props) {
  const [fullName, setFullName] = useState(employee?.fullName ?? '')
  const [idNumber, setIdNumber] = useState(employee ? formatDocument(employee.document) : '')
  const [position, setPosition] = useState(employee?.position ?? '')
  const [area, setArea] = useState(employee?.area ?? '')
  const [status, setStatus] = useState<EmployeeStatus>(employee?.status ?? 'activo')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = { fullName, document: idNumber, position, area, ...(employee ? { status } : {}) }
      if (employee) await api(`/api/employees/${employee.id}`, { method: 'PATCH', body })
      else await api('/api/employees', { method: 'POST', body })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el empleado.')
      setSaving(false)
    }
  }

  return (
    <Modal title={employee ? 'Editar empleado' : 'Nuevo empleado'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field id="emp-name" label="Nombre completo">
          <input id="emp-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} maxLength={120} />
        </Field>
        <Field id="emp-doc" label="Identificación">
          <input id="emp-doc" className="input" inputMode="numeric" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} required placeholder="1.002.345.678" />
        </Field>
        <Field id="emp-position" label="Cargo">
          <input id="emp-position" className="input" value={position} onChange={(e) => setPosition(e.target.value)} required maxLength={80} />
        </Field>
        <Field id="emp-area" label="Área">
          <input id="emp-area" className="input" list="areas-list" value={area} onChange={(e) => setArea(e.target.value)} required maxLength={80} />
          <datalist id="areas-list">
            {areas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Field>
        {employee && (
          <Field id="emp-status" label="Estado">
            <select id="emp-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as EmployeeStatus)}>
              {(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => (
                <option key={s} value={s}>
                  {employeeStatusLabel[s]}
                </option>
              ))}
            </select>
            {status === 'inactivo' && employee.status === 'activo' && (
              <p className="mt-1.5 text-xs text-muted">Al inactivarlo, su credencial deja de funcionar de inmediato.</p>
            )}
            {status === 'activo' && employee.status === 'inactivo' && (
              <p className="mt-1.5 text-xs text-muted">Al reactivarlo se emite una credencial nueva.</p>
            )}
          </Field>
        )}

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
