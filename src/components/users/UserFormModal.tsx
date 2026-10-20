import { useState, type FormEvent, type ReactNode } from 'react'
import Modal from '../app/Modal'
import { useApi } from '../../hooks/useApi'
import { api, ApiError } from '../../lib/api'
import { roleLabel } from '../../lib/labels'
import type { LinkableEmployee, Role, UserRow } from '../../lib/types'

interface Props {
  user?: UserRow
  isSelf?: boolean
  onClose: () => void
  onSaved: () => void
}

const ROLES = Object.keys(roleLabel) as Role[]

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

export default function UserFormModal({ user, isSelf = false, onClose, onSaved }: Props) {
  const editing = Boolean(user)
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [role, setRole] = useState<Role>(user?.role ?? 'control_acceso')
  const [employeeId, setEmployeeId] = useState('')
  const [isActive, setIsActive] = useState(user?.isActive ?? true)
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const linkable = useApi<{ data: LinkableEmployee[] }>(editing ? null : '/api/users/linkable-employees')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (user) {
        await api(`/api/users/${user.id}`, { method: 'PATCH', body: { fullName, role, isActive } })
      } else {
        await api('/api/users', {
          method: 'POST',
          body: { fullName, email, role, password, ...(employeeId ? { employeeId } : {}) },
        })
      }
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el usuario.')
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <Field id="usr-name" label="Nombre completo">
          <input id="usr-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={3} maxLength={120} />
        </Field>

        {!editing && (
          <Field id="usr-email" label="Correo electrónico">
            <input id="usr-email" type="email" autoComplete="off" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={200} />
          </Field>
        )}

        <Field
          id="usr-role"
          label="Rol"
          hint={isSelf ? 'No puedes cambiar tu propio rol.' : editing && !user?.employeeId ? 'Este usuario no está vinculado a un empleado, por eso no puede tener rol Empleado.' : undefined}
        >
          <select id="usr-role" className="input" value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf}>
            {ROLES.map((r) => (
              <option key={r} value={r} disabled={editing && r === 'empleado' && !user?.employeeId}>
                {roleLabel[r]}
              </option>
            ))}
          </select>
        </Field>

        {!editing && (
          <Field
            id="usr-employee"
            label={role === 'empleado' ? 'Empleado vinculado' : 'Empleado vinculado (opcional)'}
            hint="Solo aparecen empleados activos que aún no tienen usuario. El vínculo le da un carnet digital."
          >
            <select id="usr-employee" className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required={role === 'empleado'}>
              <option value="">{linkable.loading && !linkable.data ? 'Cargando…' : 'Sin vincular'}</option>
              {linkable.data?.data.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} · {emp.code}
                </option>
              ))}
            </select>
          </Field>
        )}

        {editing && (
          <Field id="usr-active" label="Estado" hint={isSelf ? 'No puedes desactivar tu propio usuario.' : 'Al desactivarlo se cierran sus sesiones abiertas.'}>
            <select id="usr-active" className="input" value={isActive ? 'true' : 'false'} onChange={(e) => setIsActive(e.target.value === 'true')} disabled={isSelf}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </Field>
        )}

        {!editing && (
          <Field id="usr-password" label="Contraseña inicial" hint="Mínimo 10 caracteres, con letras y números. Compártela de forma segura y pide que la cambie.">
            <input id="usr-password" type="password" autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={10} />
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
