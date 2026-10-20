import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { initials } from '../../lib/format'
import { toneChip, type Tone } from '../../lib/tones'
import type { SortState } from '../../hooks/useListState'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-base text-muted">{subtitle}</p>
      </div>
      {action}
    </div>
  )
}

export function Pill({ tone, icon: Icon, children }: { tone: Tone; icon: LucideIcon; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${toneChip[tone]}`}
    >
      <Icon size={11} aria-hidden="true" />
      {children}
    </span>
  )
}

export function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand dark:bg-brand/20 dark:text-blue-300"
    >
      {initials(name)}
    </span>
  )
}

const fieldBase =
  'flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 dark:border-slate-700 dark:bg-slate-900'

export function SearchField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className={`${fieldBase} w-full sm:w-72`}>
      <Search size={15} className="shrink-0 text-slate-500" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full bg-transparent outline-none placeholder:text-slate-500"
      />
    </label>
  )
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: (string | { value: string; label: string })[]
}) {
  return (
    <label className={`${fieldBase} relative`}>
      <Filter size={14} className="shrink-0 text-slate-500" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full cursor-pointer appearance-none bg-transparent pr-6 outline-none dark:[color-scheme:dark]"
      >
        <option value="">{label}</option>
        {options.map((option) => {
          const { value: optionValue, label: optionLabel } =
            typeof option === 'string' ? { value: option, label: option } : option
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          )
        })}
      </select>
      <ChevronDown size={14} className="pointer-events-none absolute right-3 text-slate-500" aria-hidden="true" />
    </label>
  )
}

export function SortHeader<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string
  sortKey: K
  sort: SortState<K> | null
  onSort: (key: K) => void
}) {
  const active = sort?.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th
      scope="col"
      aria-sort={!active ? 'none' : sort.dir === 'asc' ? 'ascending' : 'descending'}
      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold"
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 rounded hover:text-ink dark:hover:text-white"
      >
        {label}
        <Icon size={12} className={active ? 'text-brand' : 'text-slate-400'} aria-hidden="true" />
      </button>
    </th>
  )
}

export function IconAction({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Icon size={14} />
    </button>
  )
}

type PageItem = number | 'gap-left' | 'gap-right'

function pageItems(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: PageItem[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) items.push('gap-left')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < total - 1) items.push('gap-right')
  items.push(total)
  return items
}

export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  const box =
    'flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40'
  const idle = 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'

  return (
    <nav aria-label="Paginación" className="flex items-center gap-1.5">
      <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => onChange(page - 1)} className={`${box} ${idle}`}>
        <ChevronLeft size={14} />
      </button>
      {pageItems(page, pageCount).map((item) =>
        typeof item === 'number' ? (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            onClick={() => onChange(item)}
            className={`${box} ${item === page ? 'border-brand bg-brand font-semibold text-white' : idle}`}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="px-1 text-slate-400" aria-hidden="true">
            …
          </span>
        ),
      )}
      <button type="button" aria-label="Página siguiente" disabled={page === pageCount} onClick={() => onChange(page + 1)} className={`${box} ${idle}`}>
        <ChevronRight size={14} />
      </button>
    </nav>
  )
}

export function EmptyRow({ colSpan, onClear }: { colSpan: number; onClear: () => void }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center">
        <p className="text-sm font-semibold">No hay resultados con estos filtros.</p>
        <button type="button" onClick={onClear} className="mt-2 text-sm font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
          Limpiar filtros
        </button>
      </td>
    </tr>
  )
}

export const tableShell = 'card overflow-hidden'
export const theadClass = 'bg-slate-50 text-muted dark:bg-slate-800/50'
export const rowClass = 'border-t border-slate-100 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:bg-slate-800/40'
