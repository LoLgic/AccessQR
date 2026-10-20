import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, LogIn, LogOut, ScanLine, XCircle } from 'lucide-react'
import { PageHeader } from '../components/app/ui'
import { ErrorBlock, LoadingBlock } from '../components/app/State'
import { useApi } from '../hooks/useApi'
import { formatTime } from '../lib/format'
import { activityTitle } from '../lib/labels'
import { toneChip, type Tone } from '../lib/tones'
import type { GateDashboard } from '../lib/types'

const REFRESH_MS = 30_000

export default function Porteria() {
  const { data, error, reload } = useApi<GateDashboard>('/api/dashboard/gate')

  // El turno de portería se actualiza solo cada 30 segundos.
  useEffect(() => {
    const id = setInterval(reload, REFRESH_MS)
    return () => clearInterval(id)
  }, [reload])

  const updatedAt = useMemo(() => formatTime(Date.now()), [data])

  const stats = data
    ? [
        { label: 'Accesos de hoy', value: data.today.entries + data.today.exits, caption: `Actualizado ${updatedAt}`, icon: BarChart3, tone: 'blue' as Tone },
        { label: 'Entradas', value: data.today.entries, caption: 'Hoy', icon: LogIn, tone: 'green' as Tone },
        { label: 'Salidas', value: data.today.exits, caption: 'Hoy', icon: LogOut, tone: 'slate' as Tone },
        { label: 'Denegados', value: data.today.denied, caption: 'Intentos sin acceso', icon: XCircle, tone: 'red' as Tone },
      ]
    : []

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Turno de portería" subtitle="Valida credenciales y registra ingresos y salidas." />

      <Link
        to="/m/escaner"
        className="mt-6 flex h-[88px] w-full items-center justify-center gap-3 rounded-2xl bg-brand text-xl font-semibold tracking-wide text-white shadow-card transition-colors hover:bg-brand-700"
      >
        <ScanLine size={30} aria-hidden="true" />
        ESCANEAR QR
      </Link>

      {!data ? (
        <div className="mt-5">{error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock />}</div>
      ) : (
        <>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, caption, icon: Icon, tone }) => (
              <li key={label} className="card p-5">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-muted">{label}</p>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneChip[tone]}`}>
                    <Icon size={17} />
                  </span>
                </div>
                <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
                <p className="mt-1.5 text-xs text-muted">{caption}</p>
              </li>
            ))}
          </ul>

          <section className="card mt-5 p-6" aria-labelledby="last-title">
            <div className="flex items-center justify-between">
              <h2 id="last-title" className="text-base font-semibold">
                Últimos accesos
              </h2>
              <Link to="/porteria/historial" className="text-xs font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
                Ver historial
              </Link>
            </div>
            {data.recent.length === 0 ? (
              <p className="mt-5 text-sm text-muted">Aún no hay accesos registrados.</p>
            ) : (
              <ul className="mt-5 space-y-4">
                {data.recent.map((item) => {
                  const denied = item.result === 'denegado'
                  const Icon = denied ? XCircle : item.movement === 'entrada' ? LogIn : LogOut
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneChip[denied ? 'red' : 'green']}`}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">
                          {activityTitle(item)}
                          {denied && item.reason ? ` — ${item.reason.toLowerCase()}` : ''}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {item.fullName} · {item.position}
                        </p>
                      </div>
                      <span className="text-xs text-muted">{formatTime(item.occurredAt)}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
