import { useState } from 'react'
import { Download } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '../components/app/State'
import { PageHeader } from '../components/app/ui'
import DailyChart from '../components/reports/DailyChart'
import HourChart from '../components/reports/HourChart'
import { useApi } from '../hooks/useApi'
import { queryString } from '../lib/api'
import type { ReportSummary } from '../lib/types'

const pad = (n: number) => String(n).padStart(2, '0')
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function lastDays(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date()
  from.setDate(from.getDate() - (days - 1))
  return { from: toInput(from), to: toInput(to) }
}

const PRESETS = [
  { label: '7 días', days: 7 },
  { label: '30 días', days: 30 },
  { label: '90 días', days: 90 },
]

export default function Reports() {
  const initial = lastDays(30)
  const [from, setFrom] = useState(initial.from)
  const [to, setTo] = useState(initial.to)

  const invalid = !from || !to || from > to
  const range = { from, to }
  const { data, error, loading, reload } = useApi<ReportSummary>(invalid ? null : '/api/reports/summary' + queryString(range))
  const exportUrl = '/api/reports/daily.csv' + queryString(range)

  const cards = data
    ? [
        { label: 'Entradas', value: data.totals.entries },
        { label: 'Salidas', value: data.totals.exits },
        { label: 'Denegados', value: data.totals.denied },
        { label: 'Empleados distintos', value: data.totals.uniqueEmployees },
      ]
    : []

  const maxArea = data ? Math.max(1, ...data.byArea.map((a) => a.entries + a.exits)) : 1

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader
        title="Reportes"
        subtitle="Analiza el movimiento de accesos por periodo."
        action={
          invalid ? undefined : (
            <a href={exportUrl} download className="btn-outline">
              <Download size={16} />
              Exportar CSV
            </a>
          )
        }
      />

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="rep-from" className="mb-1.5 block text-xs font-medium">
            Desde
          </label>
          <input id="rep-from" type="date" className="input w-44" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="rep-to" className="mb-1.5 block text-xs font-medium">
            Hasta
          </label>
          <input id="rep-to" type="date" className="input w-44" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex gap-2" role="group" aria-label="Periodos rápidos">
          {PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              className="btn-outline h-10"
              onClick={() => {
                const r = lastDays(p.days)
                setFrom(r.from)
                setTo(r.to)
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {invalid ? (
        <p role="alert" className="mt-6 rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
          Elige un rango válido: la fecha inicial no puede ser posterior a la final (máximo 366 días).
        </p>
      ) : !data ? (
        <div className="mt-6">{error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock label="Calculando reporte…" />}</div>
      ) : (
        <div className={`mt-6 space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {error && <ErrorBlock message={error} onRetry={reload} />}

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((c) => (
              <li key={c.label} className="card p-5">
                <p className="text-sm text-muted">{c.label}</p>
                <p className="mt-2 text-4xl font-bold tracking-tight">{c.value.toLocaleString('es-CO')}</p>
              </li>
            ))}
          </ul>

          <section className="card p-6" aria-labelledby="daily-title">
            <h2 id="daily-title" className="text-base font-semibold">
              Accesos por día
            </h2>
            <p className="mt-0.5 mb-5 text-xs text-muted">
              {data.from} a {data.to}
            </p>
            <DailyChart data={data.daily} />
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="card p-6" aria-labelledby="hour-title">
              <h2 id="hour-title" className="text-base font-semibold">
                Horas de mayor movimiento
              </h2>
              <p className="mt-0.5 mb-5 text-xs text-muted">Accesos autorizados por hora del día.</p>
              <HourChart data={data.byHour} />
            </section>

            <section className="card p-6" aria-labelledby="reasons-title">
              <h2 id="reasons-title" className="text-base font-semibold">
                Motivos de denegación
              </h2>
              {data.denialReasons.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No hubo accesos denegados en este periodo.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.denialReasons.map((r) => (
                    <li key={r.reason ?? 'sin-motivo'} className="flex items-center justify-between text-sm">
                      <span>{r.reason ?? 'Sin motivo'}</span>
                      <span className="font-semibold">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card p-6" aria-labelledby="area-title">
            <h2 id="area-title" className="text-base font-semibold">
              Accesos por área
            </h2>
            {data.byArea.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No hay accesos en este periodo.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {data.byArea.map((a) => {
                  const total = a.entries + a.exits
                  return (
                    <li key={a.area}>
                      <div className="flex items-center justify-between text-sm">
                        <span>{a.area}</span>
                        <span className="text-muted">
                          <span className="font-semibold text-ink dark:text-slate-100">{total}</span> accesos
                          {a.denied > 0 && ` · ${a.denied} denegados`}
                        </span>
                      </div>
                      <div
                        role="progressbar"
                        aria-label={`Accesos de ${a.area}`}
                        aria-valuenow={total}
                        aria-valuemin={0}
                        aria-valuemax={maxArea}
                        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                      >
                        <div className="h-full rounded-full bg-brand" style={{ width: `${(total / maxArea) * 100}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
