import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, KeyRound, LogIn, LogOut, Minus, QrCode } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import ChangePasswordModal from '../../components/account/ChangePasswordModal'
import { ErrorBlock, LoadingBlock } from '../../components/app/State'
import { Pill } from '../../components/app/ui'
import BigAvatar from '../../components/mobile/BigAvatar'
import CardQr from '../../components/mobile/CardQr'
import EmployeeShell from '../../components/mobile/EmployeeShell'
import { useApi } from '../../hooks/useApi'
import { useCard } from '../../hooks/useCard'
import { formatDate, formatTime, initials } from '../../lib/format'
import type { MyAccess } from '../../lib/types'

export default function EmployeeHome() {
  const { card, error, reload } = useCard()
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }
  const latest = useApi<{ data: MyAccess[] }>('/api/me/access-logs?limit=3')

  if (!card) {
    return (
      <EmployeeShell>
        {error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock label="Cargando tu carnet…" />}
      </EmployeeShell>
    )
  }

  const { employee } = card
  const active = employee.status === 'activo'

  return (
    <EmployeeShell>
      <h1 className="text-4xl font-bold tracking-tight">Hola, {employee.fullName.split(' ')[0]}</h1>
      <p className="mt-2 text-base text-slate-500">
        {card.qr ? 'Tu carnet está activo y listo para usar.' : 'Tu carnet no está disponible por ahora.'}
      </p>

      <section className="card mt-6 p-5" aria-label="Tu carnet">
        <div className="flex items-center gap-4">
          <BigAvatar initials={initials(employee.fullName)} className="h-14 w-14 text-lg" />
          <div>
            <p className="text-lg font-bold">{employee.fullName}</p>
            <p className="text-sm text-slate-500">{employee.position}</p>
            <span className="mt-1.5 inline-block">
              <Pill tone={active ? 'green' : 'slate'} icon={active ? CheckCircle2 : Minus}>
                {active ? 'Activo' : 'Inactivo'}
              </Pill>
            </span>
          </div>
        </div>

        <CardQr card={card} className="mx-auto mt-5 h-44 w-44" />

        {card.qr && (
          <Link to="/m/qr" className="btn-primary mt-5 h-12 w-full text-base">
            <QrCode size={18} aria-hidden="true" />
            Mostrar QR
          </Link>
        )}
      </section>

      <section className="card mt-5 p-5" aria-labelledby="latest-title">
        <h2 id="latest-title" className="text-lg font-bold">
          Últimos accesos
        </h2>
        {!latest.data ? (
          <p className="mt-3 text-sm text-slate-500">{latest.error ?? 'Cargando…'}</p>
        ) : latest.data.data.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aún no tienes accesos registrados.</p>
        ) : (
          <ul className="mt-3 space-y-4">
            {latest.data.data.map((a) => (
              <li key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{formatDate(a.occurredAt)}</p>
                  <p className="text-sm text-slate-500">{formatTime(a.occurredAt)}</p>
                </div>
                {a.result === 'denegado' ? (
                  <Pill tone="red" icon={Minus}>
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
      </section>

      <section className="card mt-5 divide-y divide-slate-100" aria-label="Mi cuenta">
        <button type="button" onClick={() => setPasswordOpen(true)} className="flex w-full items-center gap-3 px-5 py-4 text-left font-semibold hover:bg-slate-50">
          <KeyRound size={18} className="text-slate-500" aria-hidden="true" />
          Cambiar contraseña
        </button>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-5 py-4 text-left font-semibold hover:bg-slate-50">
          <LogOut size={18} className="text-slate-500" aria-hidden="true" />
          Cerrar sesión
        </button>
      </section>

      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </EmployeeShell>
  )
}
