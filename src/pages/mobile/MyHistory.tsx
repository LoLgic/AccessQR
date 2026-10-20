import { LogIn, LogOut, XCircle } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '../../components/app/State'
import { Pill } from '../../components/app/ui'
import EmployeeShell from '../../components/mobile/EmployeeShell'
import { useApi } from '../../hooks/useApi'
import { formatDate, formatTime } from '../../lib/format'
import type { MyAccess } from '../../lib/types'

export default function MyHistory() {
  const { data, error, reload } = useApi<{ data: MyAccess[] }>('/api/me/access-logs?limit=20')

  return (
    <EmployeeShell>
      <h1 className="text-3xl font-bold tracking-tight">Mi historial</h1>
      <p className="mt-2 text-base text-slate-500">Tus últimos ingresos y salidas.</p>

      <div className="mt-6">
        {!data ? (
          error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock />
        ) : data.data.length === 0 ? (
          <p className="card p-6 text-center text-sm text-slate-500">Aún no tienes accesos registrados.</p>
        ) : (
          <ul className="card divide-y divide-slate-100">
            {data.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-semibold">{formatDate(a.occurredAt)}</p>
                  <p className="text-sm text-slate-500">
                    {formatTime(a.occurredAt)} · {a.point}
                  </p>
                </div>
                {a.result === 'denegado' ? (
                  <Pill tone="red" icon={XCircle}>
                    Denegado
                  </Pill>
                ) : a.movement === 'entrada' ? (
                  <Pill tone="blue" icon={LogIn}>
                    Entrada
                  </Pill>
                ) : (
                  <Pill tone="slate" icon={LogOut}>
                    Salida
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </EmployeeShell>
  )
}
