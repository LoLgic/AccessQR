import { useState } from 'react'
import { CheckCircle2, Contact, KeyRound, Minus, Pencil, Plus, ScanLine, ShieldCheck, type LucideIcon } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ErrorBlock } from '../components/app/State'
import {
  Avatar,
  IconAction,
  PageHeader,
  Pagination,
  Pill,
  SearchField,
  SelectFilter,
  SortHeader,
  rowClass,
  tableShell,
  theadClass,
} from '../components/app/ui'
import ResetPasswordModal from '../components/users/ResetPasswordModal'
import UserFormModal from '../components/users/UserFormModal'
import { useApi } from '../hooks/useApi'
import { useDebounced } from '../hooks/useDebounced'
import { pageInfo, useListState } from '../hooks/useListState'
import { queryString } from '../lib/api'
import { formatDate } from '../lib/format'
import { roleLabel } from '../lib/labels'
import type { Tone } from '../lib/tones'
import type { Paged, Role, UserRow } from '../lib/types'

type SortKey = 'name' | 'email' | 'role' | 'status' | 'createdAt'

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Usuario' },
  { key: 'email', label: 'Correo' },
  { key: 'role', label: 'Rol' },
  { key: 'status', label: 'Estado' },
  { key: 'createdAt', label: 'Creado' },
]

const PAGE_SIZE = 10

const rolePill: Record<Role, { tone: Tone; icon: LucideIcon }> = {
  admin: { tone: 'blue', icon: ShieldCheck },
  control_acceso: { tone: 'slate', icon: ScanLine },
  empleado: { tone: 'green', icon: Contact },
}

type ModalState = { kind: 'create' } | { kind: 'edit' | 'password'; user: UserRow } | null

export default function Users() {
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [active, setActive] = useState('')
  const [modal, setModal] = useState<ModalState>(null)

  const q = useDebounced(query.trim())
  const list = useListState<SortKey>([q, role, active].join('|'))

  const url =
    '/api/users' +
    queryString({ q, role, active, sort: list.sort?.key, dir: list.sort?.dir, page: list.page, pageSize: PAGE_SIZE })
  const { data, error, loading, reload } = useApi<Paged<UserRow>>(url)

  const total = data?.total ?? 0
  const { pageCount, from, to } = pageInfo(list.page, PAGE_SIZE, total)

  const clearFilters = () => {
    setQuery('')
    setRole('')
    setActive('')
  }
  const afterChange = () => {
    setModal(null)
    reload()
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Usuarios y roles"
        subtitle="Administra quién puede entrar a AccessQR y con qué permisos."
        action={
          <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <Plus size={16} />
            Nuevo usuario
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <SearchField label="Buscar usuario" placeholder="Buscar por nombre o correo" value={query} onChange={setQuery} />
        <SelectFilter
          label="Rol"
          value={role}
          onChange={setRole}
          options={(Object.keys(roleLabel) as Role[]).map((r) => ({ value: r, label: roleLabel[r] }))}
        />
        <SelectFilter
          label="Estado"
          value={active}
          onChange={setActive}
          options={[
            { value: 'true', label: 'Activo' },
            { value: 'false', label: 'Inactivo' },
          ]}
        />
      </div>

      {error && !data ? (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={reload} />
        </div>
      ) : (
        <div className={`${tableShell} mt-5`} aria-busy={loading}>
          <div className={`overflow-x-auto transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[860px] text-sm">
              <thead className={theadClass}>
                <tr>
                  {columns.map((c) => (
                    <SortHeader key={c.key} label={c.label} sortKey={c.key} sort={list.sort} onSort={list.toggleSort} />
                  ))}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-muted" role="status">
                      Cargando usuarios…
                    </td>
                  </tr>
                ) : data.data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold">No hay usuarios con estos filtros.</p>
                      <button type="button" onClick={clearFilters} className="mt-2 text-sm font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  data.data.map((u) => {
                    const rp = rolePill[u.role]
                    const isSelf = u.id === me?.id
                    return (
                      <tr key={u.id} className={rowClass}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={u.fullName} />
                            <div>
                              <p className="whitespace-nowrap font-semibold">
                                {u.fullName}
                                {isSelf && <span className="ml-1.5 text-xs font-normal text-muted">(tú)</span>}
                              </p>
                              {u.employeeCode && <p className="text-xs text-muted">{u.employeeCode}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{u.email}</td>
                        <td className="px-4 py-3">
                          <Pill tone={rp.tone} icon={rp.icon}>
                            {roleLabel[u.role]}
                          </Pill>
                        </td>
                        <td className="px-4 py-3">
                          {u.isActive ? (
                            <Pill tone="green" icon={CheckCircle2}>
                              Activo
                            </Pill>
                          ) : (
                            <Pill tone="slate" icon={Minus}>
                              Inactivo
                            </Pill>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <IconAction icon={Pencil} label={`Editar a ${u.fullName}`} onClick={() => setModal({ kind: 'edit', user: u })} />
                            {!isSelf && (
                              <IconAction icon={KeyRound} label={`Restablecer contraseña de ${u.fullName}`} onClick={() => setModal({ kind: 'password', user: u })} />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Mostrando {from}–{to} de {total.toLocaleString('es-CO')} usuarios
        </p>
        <Pagination page={list.page} pageCount={pageCount} onChange={list.setPage} />
      </div>

      {modal?.kind === 'create' && <UserFormModal onClose={() => setModal(null)} onSaved={afterChange} />}
      {modal?.kind === 'edit' && (
        <UserFormModal user={modal.user} isSelf={modal.user.id === me?.id} onClose={() => setModal(null)} onSaved={afterChange} />
      )}
      {modal?.kind === 'password' && <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />}
    </div>
  )
}
