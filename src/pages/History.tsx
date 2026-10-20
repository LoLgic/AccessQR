import { useState } from 'react'
import { Calendar, CheckCircle2, Download, LogIn, LogOut, XCircle } from 'lucide-react'
import { ErrorBlock } from '../components/app/State'
import {
  Avatar,
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
import { useApi } from '../hooks/useApi'
import { useDebounced } from '../hooks/useDebounced'
import { pageInfo, useListState } from '../hooks/useListState'
import { queryString } from '../lib/api'
import { formatDate, formatDocument, formatTime } from '../lib/format'
import { movementLabel, resultLabel } from '../lib/labels'
import type { AccessLogRow, AccessResultKind, Movement, Paged } from '../lib/types'

type SortKey = 'name' | 'document' | 'movement' | 'occurredAt' | 'result' | 'point'

const PAGE_SIZE = 10

export default function History() {
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [movement, setMovement] = useState('')
  const [result, setResult] = useState('')

  const q = useDebounced(query.trim())
  const list = useListState<SortKey>([q, date, movement, result].join('|'))

  const filterParams = { q, date, movement, result }
  const url =
    '/api/access-logs' +
    queryString({ ...filterParams, sort: list.sort?.key, dir: list.sort?.dir, page: list.page, pageSize: PAGE_SIZE })
  const exportUrl = '/api/access-logs/export.csv' + queryString(filterParams)

  const { data, error, loading, reload } = useApi<Paged<AccessLogRow>>(url)
  const total = data?.total ?? 0
  const { pageCount, from, to } = pageInfo(list.page, PAGE_SIZE, total)

  const clearFilters = () => {
    setQuery('')
    setDate('')
    setMovement('')
    setResult('')
  }

  const head = (label: string, key: SortKey) => (
    <SortHeader label={label} sortKey={key} sort={list.sort} onSort={list.toggleSort} />
  )

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Historial de accesos"
        subtitle="Consulta y audita cada ingreso y salida registrados."
        action={
          <a href={exportUrl} download className="btn-outline">
            <Download size={16} />
            Exportar
          </a>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <SearchField label="Buscar empleado" placeholder="Buscar empleado" value={query} onChange={setQuery} />
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 dark:border-slate-700 dark:bg-slate-900">
          <Calendar size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
          <span className="sr-only">Fecha</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-full bg-transparent outline-none dark:[color-scheme:dark]"
          />
        </label>
        <SelectFilter
          label="Tipo de movimiento"
          value={movement}
          onChange={setMovement}
          options={(Object.keys(movementLabel) as Movement[]).map((m) => ({ value: m, label: movementLabel[m] }))}
        />
        <SelectFilter
          label="Estado"
          value={result}
          onChange={setResult}
          options={(Object.keys(resultLabel) as AccessResultKind[]).map((r) => ({ value: r, label: resultLabel[r] }))}
        />
      </div>

      {error && !data ? (
        <div className="mt-5">
          <ErrorBlock message={error} onRetry={reload} />
        </div>
      ) : (
        <div className={`${tableShell} mt-5`} aria-busy={loading}>
          <div className={`overflow-x-auto transition-opacity ${loading && data ? 'opacity-60' : ''}`}>
            <table className="w-full min-w-[900px] text-sm">
              <thead className={theadClass}>
                <tr>
                  {head('Empleado', 'name')}
                  {head('Identificación', 'document')}
                  {head('Tipo', 'movement')}
                  {head('Fecha', 'occurredAt')}
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold">
                    Hora
                  </th>
                  {head('Estado', 'result')}
                  {head('Punto de acceso', 'point')}
                </tr>
              </thead>
              <tbody>
                {!data ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted" role="status">
                      Cargando historial…
                    </td>
                  </tr>
                ) : data.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold">No hay resultados con estos filtros.</p>
                      <button type="button" onClick={clearFilters} className="mt-2 text-sm font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
                        Limpiar filtros
                      </button>
                    </td>
                  </tr>
                ) : (
                  data.data.map((r) => (
                    <tr key={r.id} className={rowClass}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={r.fullName} />
                          <span className="whitespace-nowrap font-semibold">{r.fullName}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDocument(r.document)}</td>
                      <td className="px-4 py-3">
                        {r.movement === 'entrada' ? (
                          <Pill tone="blue" icon={LogIn}>
                            Entrada
                          </Pill>
                        ) : (
                          <Pill tone="slate" icon={LogOut}>
                            Salida
                          </Pill>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(r.occurredAt)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{formatTime(r.occurredAt)}</td>
                      <td className="px-4 py-3" title={r.reason ?? undefined}>
                        {r.result === 'autorizado' ? (
                          <Pill tone="green" icon={CheckCircle2}>
                            Autorizado
                          </Pill>
                        ) : (
                          <Pill tone="red" icon={XCircle}>
                            Denegado
                          </Pill>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{r.point}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          Mostrando {from}–{to} de {total.toLocaleString('es-CO')} registros
        </p>
        <Pagination page={list.page} pageCount={pageCount} onChange={list.setPage} />
      </div>
    </div>
  )
}
