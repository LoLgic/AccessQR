import { Link } from 'react-router-dom'
import { CheckCircle2, Clock, Contact, LogIn, LogOut, Minus, Plus, ScanLine, Users, XCircle } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ErrorBlock, LoadingBlock } from '../components/app/State'
import WeeklyChart from '../components/app/WeeklyChart'
import { useApi } from '../hooks/useApi'
import { formatTime } from '../lib/format'
import { activityTitle } from '../lib/labels'
import { toneChip, type Tone } from '../lib/tones'
import type { AdminDashboard } from '../lib/types'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, error, reload } = useApi<AdminDashboard>('/api/dashboard/admin')

  const firstName = user?.fullName.split(' ')[0] ?? ''

  const header = (
    <>
      <h1 className="text-3xl font-bold tracking-tight">
        {greeting()}, {firstName}
      </h1>
      <p className="mt-1.5 text-base text-muted">Resumen del control de acceso de tu organización.</p>
    </>
  )

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px]">
        {header}
        <div className="mt-7">{error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock />}</div>
      </div>
    )
  }

  const { totals, today, weekly, recent } = data
  const accessesToday = today.entries + today.exits
  const activePct = totals.employees ? Math.round((totals.active / totals.employees) * 100) : 0

  const stats = [
    { label: 'Total empleados', value: totals.employees, caption: 'NovaTech Solutions', icon: Users, tone: 'blue' as Tone },
    { label: 'Empleados activos', value: totals.active, caption: `${activePct} % del personal`, icon: CheckCircle2, tone: 'green' as Tone },
    { label: 'Empleados inactivos', value: totals.inactive, caption: 'Sin acceso habilitado', icon: Minus, tone: 'slate' as Tone },
    { label: 'Accesos de hoy', value: accessesToday, caption: `${today.entries} entradas · ${today.exits} salidas`, icon: LogIn, tone: 'blue' as Tone },
  ]

  const statusBars = [
    { label: 'Activos', value: totals.active, bar: 'bg-green-600', icon: CheckCircle2, tone: 'green' as Tone },
    { label: 'Inactivos', value: totals.inactive, bar: 'bg-slate-300 dark:bg-slate-600', icon: Minus, tone: 'slate' as Tone },
    { label: 'Credenciales por revisar', value: totals.credentialsToReview, bar: 'bg-amber-500', icon: XCircle, tone: 'amber' as Tone },
  ]

  return (
    <div className="mx-auto max-w-[1100px]">
      {header}

      <ul className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, caption, icon: Icon, tone }) => (
          <li key={label} className="card p-5">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted">{label}</p>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneChip[tone]}`}>
                <Icon size={17} />
              </span>
            </div>
            <p className="mt-3 text-4xl font-bold tracking-tight">{value.toLocaleString('es-CO')}</p>
            <p className="mt-1.5 text-xs text-muted">{caption}</p>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <WeeklyChart data={weekly} />

        <section className="card p-6" aria-labelledby="activity-title">
          <div className="flex items-center justify-between">
            <h2 id="activity-title" className="text-base font-semibold">
              Actividad reciente
            </h2>
            <Link to="/app/historial" className="text-xs font-semibold text-brand hover:text-brand-700 dark:text-blue-300">
              Ver todo
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-5 text-sm text-muted">Aún no hay accesos registrados.</p>
          ) : (
            <ul className="mt-5 space-y-4">
              {recent.map((item) => {
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
                      <p className="text-sm font-semibold">{activityTitle(item)}</p>
                      <p className="truncate text-xs text-muted">{item.fullName}</p>
                    </div>
                    <span className="text-xs text-muted">{formatTime(item.occurredAt)}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="card p-6" aria-labelledby="status-title">
          <h2 id="status-title" className="text-base font-semibold">
            Estado de empleados
          </h2>
          <ul className="mt-5 space-y-4">
            {statusBars.map(({ label, value, bar, icon: Icon, tone }) => (
              <li key={label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${toneChip[tone]}`}>
                      <Icon size={12} />
                    </span>
                    {label}
                  </span>
                  <span className="font-semibold">{value}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={label}
                  aria-valuenow={value}
                  aria-valuemin={0}
                  aria-valuemax={totals.employees}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
                >
                  <div
                    className={`h-full rounded-full ${bar}`}
                    style={{ width: `${value === 0 || totals.employees === 0 ? 0 : Math.max((value / totals.employees) * 100, 2.5)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-6" aria-labelledby="actions-title">
          <h2 id="actions-title" className="text-base font-semibold">
            Acciones rápidas
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link to="/app/empleados" className="btn-outline">
              <Plus size={16} />
              Agregar empleado
            </Link>
            <Link to="/app/empleados" className="btn-outline">
              <Contact size={16} />
              Generar credencial
            </Link>
            <Link to="/app/escanear-qr" className="btn-primary">
              <ScanLine size={16} />
              Escanear QR
            </Link>
            <Link to="/app/historial" className="btn-outline">
              <Clock size={16} />
              Ver historial
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
