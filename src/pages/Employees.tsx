import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Contact, Eye, Lock, Minus, Pencil, Plus, ShieldCheck, type LucideIcon } from 'lucide-react'
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
import CredentialModal from '../components/employees/CredentialModal'
import EmployeeDetailModal from '../components/employees/EmployeeDetailModal'
import EmployeeFormModal from '../components/employees/EmployeeFormModal'
import { useApi } from '../hooks/useApi'
import { useDebounced } from '../hooks/useDebounced'
import { pageInfo, useListState } from '../hooks/useListState'
import { queryString } from '../lib/api'
import { formatDocument, formatLastAccess } from '../lib/format'
import { credentialLabel, employeeStatusLabel } from '../lib/labels'
import type { Tone } from '../lib/tones'
import type { CredentialStatus, EmployeeFilters, EmployeeRow, EmployeeStatus, Paged } from '../lib/types'

type SortKey = 'name' | 'document' | 'role' | 'area' | 'status' | 'credential' | 'lastAccess'

const columns: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Empleado' },
  { key: 'document', label: 'Identificación' },
  { key: 'role', label: 'Cargo' },
  { key: 'area', label: 'Área' },
  { key: 'status', label: 'Estado' },
  { key: 'credential', label: 'Credencial' },
  { key: 'lastAccess', label: 'Último acceso' },
]

const PAGE_SIZE = 10

const statusPill: Record<EmployeeStatus, { tone: Tone; icon: LucideIcon }> = {
  activo: { tone: 'green', icon: CheckCircle2 },
  inactivo: { tone: 'slate', icon: Minus },
}

const credentialPill: Record<CredentialStatus, { tone: Tone; icon: LucideIcon }> = {
  vigente: { tone: 'green', icon: ShieldCheck },
  inactiva: { tone: 'slate', icon: Lock },
  por_revisar: { tone: 'amber', icon: AlertTriangle },
}

type ModalState =
  | { kind: 'create' }
  | { kind: 'view' | 'edit' | 'credential'; employee: EmployeeRow }
  | null

export default function Employees() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [area, setArea] = useState('')
  const [position, setPosition] = useState('')
  // /app/credenciales redirige aquí con ?credential=por_revisar
  const { search } = useLocation()
  const [credential, setCredential] = useState(() => {
    const value = new URLSearchParams(search).get('credential') ?? ''
    return value in credentialLabel ? value : ''
  })
  const [modal, setModal] = useState<ModalState>(null)

  const q = useDebounced(query.trim())
  const list = useListState<SortKey>([q, status, credential, area, position].join('|'))

  const url =
    '/api/employees' +
    queryString({
      q,
      status,
      credential,
      area,
      position,
      sort: list.sort?.key,
      dir: list.sort?.dir,
      page: list.page,
      pageSize: PAGE_SIZE,
    })

  const { data, error, loading, reload } = useApi<Paged<EmployeeRow>>(url)
  const filters = useApi<EmployeeFilters>('/api/employees/filters')

  const total = data?.total ?? 0
  const { pageCount, from, to } = pageInfo(list.page, PAGE_SIZE, total)

  const clearFilters = () => {
    setQuery('')
    setStatus('')
    setCredential('')
    setArea('')
    setPosition('')
  }

  const closeModal = () => setModal(null)
  const afterChange = () => {
    setModal(null)
    reload()
    filters.reload()
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Empleados"
        subtitle="Administra el personal autorizado y sus credenciales digitales."
        action={
          <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <Plus size={16} />
            Nuevo empleado
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <SearchField label="Buscar empleado" placeholder="Buscar por nombre o identificación" value={query} onChange={setQuery} />
        <SelectFilter
          label="Estado"
          value={status}
          onChange={setStatus}
          options={(Object.keys(employeeStatusLabel) as EmployeeStatus[]).map((s) => ({ value: s, label: employeeStatusLabel[s] }))}
        />
        <SelectFilter
          label="Credencial"
          value={credential}
          onChange={setCredential}
          options={(Object.keys(credentialLabel) as CredentialStatus[]).map((c) => ({ value: c, label: credentialLabel[c] }))}
        />
        <SelectFilter label="Área" value={area} onChange={setArea} options={filters.data?.areas ?? []} />
        <SelectFilter label="Cargo" value={position} onChange={setPosition} options={filters.data?.positions ?? []} />
      </div>

      {error && !data ? (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={reload} />
        </div>
      ) : (
        <div className={`${tableShell} mt-5`} aria-busy={loading}>
          {error && (
            <p role="alert" className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              {error}{' '}
              <button type="button" onClick={reload} className="font-semibold underline">
                Reintentar
              </button>
            </p>
          )}
          <div className={`overflow-x-auto transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[960px] text-sm">
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
                      Cargando empleados…
                    </td>
                  </tr>
                ) : data.data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold">No hay resultados con estos filtros.</p>
                      <button type="button" onClick={clearFilters} className="mt-2 text-sm font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  data.data.map((e) => {
                    const st = statusPill[e.status]
                    const cr = credentialPill[e.credentialStatus]
                    return (
                      <tr key={e.id} className={rowClass}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={e.fullName} />
                            <span className="whitespace-nowrap font-semibold">{e.fullName}</span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDocument(e.document)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{e.position}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{e.area}</td>
                        <td className="px-4 py-3">
                          <Pill tone={st.tone} icon={st.icon}>
                            {employeeStatusLabel[e.status]}
                          </Pill>
                        </td>
                        <td className="px-4 py-3">
                          <Pill tone={cr.tone} icon={cr.icon}>
                            {credentialLabel[e.credentialStatus]}
                          </Pill>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted">{formatLastAccess(e.lastAccessAt)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <IconAction icon={Eye} label={`Ver a ${e.fullName}`} onClick={() => setModal({ kind: 'view', employee: e })} />
                            <IconAction icon={Pencil} label={`Editar a ${e.fullName}`} onClick={() => setModal({ kind: 'edit', employee: e })} />
                            <IconAction icon={Contact} label={`Credencial de ${e.fullName}`} onClick={() => setModal({ kind: 'credential', employee: e })} />
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
          Mostrando {from}–{to} de {total.toLocaleString('es-CO')} empleados
        </p>
        <Pagination page={list.page} pageCount={pageCount} onChange={list.setPage} />
      </div>

      {modal?.kind === 'create' && (
        <EmployeeFormModal areas={filters.data?.areas ?? []} onClose={closeModal} onSaved={afterChange} />
      )}
      {modal?.kind === 'edit' && (
        <EmployeeFormModal employee={modal.employee} areas={filters.data?.areas ?? []} onClose={closeModal} onSaved={afterChange} />
      )}
      {modal?.kind === 'view' && <EmployeeDetailModal employee={modal.employee} onClose={closeModal} />}
      {modal?.kind === 'credential' && <CredentialModal employee={modal.employee} onClose={closeModal} onChanged={afterChange} />}
    </div>
  )
}
