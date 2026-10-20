import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, CheckCircle2, Download, Eye, Minus, QrCode, Share2, ShieldCheck, type LucideIcon } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '../../components/app/State'
import { Pill } from '../../components/app/ui'
import BigAvatar from '../../components/mobile/BigAvatar'
import CardQr from '../../components/mobile/CardQr'
import EmployeeShell from '../../components/mobile/EmployeeShell'
import Modal from '../../components/app/Modal'
import { useCard } from '../../hooks/useCard'
import { formatDocument, initials } from '../../lib/format'
import { credentialLabel, employeeStatusLabel } from '../../lib/labels'

const tile =
  'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-1 py-3.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50'

interface TileButtonProps {
  icon: LucideIcon
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
}

function TileButton({ icon: Icon, label, onClick, disabled, title }: TileButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={`${tile} disabled:cursor-not-allowed disabled:opacity-50`}>
      <Icon size={20} aria-hidden="true" />
      {label}
    </button>
  )
}

export default function Carnet() {
  const { card, error, reload } = useCard()
  const [detailsOpen, setDetailsOpen] = useState(false)

  return (
    <EmployeeShell>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Mi carnet</h1>
        <button
          type="button"
          aria-label="Notificaciones"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
        >
          <Bell size={18} />
        </button>
      </div>

      {!card ? (
        <div className="mt-5">{error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock label="Cargando tu carnet…" />}</div>
      ) : (
        <>
          <article className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-card" aria-label="Carnet digital">
            <header className="flex items-center justify-between bg-brand px-5 py-4 text-white">
              <span className="flex items-center gap-2.5 text-lg font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand">
                  <ShieldCheck size={19} strokeWidth={2.2} />
                </span>
                AccessQR
              </span>
              <span className="text-sm">{card.company}</span>
            </header>

            <div className="flex flex-col items-center px-5 pb-6 pt-6">
              <BigAvatar initials={initials(card.employee.fullName)} className="h-24 w-24 text-3xl" />
              <h2 className="mt-4 text-2xl font-bold">{card.employee.fullName}</h2>
              <p className="text-base text-slate-500">{card.employee.position}</p>
              <span className="mt-3">
                {card.employee.status === 'activo' ? (
                  <Pill tone="green" icon={CheckCircle2}>
                    ACTIVO
                  </Pill>
                ) : (
                  <Pill tone="slate" icon={Minus}>
                    INACTIVO
                  </Pill>
                )}
              </span>

              <dl className="mt-5 flex w-full justify-between text-sm">
                <div>
                  <dt className="text-slate-500">Identificación</dt>
                  <dd className="mt-0.5 text-base font-bold">{formatDocument(card.employee.document)}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-slate-500">ID empleado</dt>
                  <dd className="mt-0.5 text-base font-bold">{card.employee.code}</dd>
                </div>
              </dl>

              <CardQr card={card} className="mt-6 h-56 w-56" />
              <p className="mt-4 text-center text-sm text-slate-500">
                {card.qr ? 'Presenta este código al personal de control' : ' '}
              </p>
            </div>
          </article>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Link
              to="/m/qr"
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl bg-brand px-1 py-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <QrCode size={20} aria-hidden="true" />
              Mostrar QR
            </Link>
            <TileButton icon={Share2} label="Compartir" disabled title="Próximamente" />
            <TileButton icon={Download} label="Descargar" disabled title="Próximamente" />
            <TileButton icon={Eye} label="Detalles" onClick={() => setDetailsOpen(true)} />
          </div>

          {detailsOpen && (
            <Modal title="Detalles del carnet" onClose={() => setDetailsOpen(false)}>
              <dl className="mt-5 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {(
                  [
                    ['Nombre', card.employee.fullName],
                    ['ID empleado', card.employee.code],
                    ['Identificación', formatDocument(card.employee.document)],
                    ['Cargo', card.employee.position],
                    ['Área', card.employee.area],
                    ['Estado', employeeStatusLabel[card.employee.status]],
                    ['Credencial', credentialLabel[card.employee.credentialStatus]],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-slate-500">{label}</dt>
                    <dd className="text-right font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-slate-500">
                Tu código QR se renueva solo cada pocos minutos, por eso no se puede compartir ni guardar como imagen.
              </p>
              <div className="mt-5 flex justify-end">
                <button type="button" onClick={() => setDetailsOpen(false)} className="btn-outline">
                  Cerrar
                </button>
              </div>
            </Modal>
          )}
        </>
      )}
    </EmployeeShell>
  )
}
