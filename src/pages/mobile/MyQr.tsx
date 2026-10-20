import { useState } from 'react'
import { CheckCircle2, Copy } from 'lucide-react'
import { ErrorBlock, LoadingBlock } from '../../components/app/State'
import { Pill } from '../../components/app/ui'
import CardQr from '../../components/mobile/CardQr'
import EmployeeShell from '../../components/mobile/EmployeeShell'
import { useCard } from '../../hooks/useCard'

export default function MyQr() {
  const { card, error, reload } = useCard()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!card?.qr) return
    try {
      await navigator.clipboard.writeText(card.qr.token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* el navegador no permitió copiar */
    }
  }

  return (
    <EmployeeShell>
      <h1 className="text-3xl font-bold tracking-tight">Mi QR</h1>
      <p className="mt-2 text-base text-slate-500">Presenta este código al personal de control.</p>

      {!card ? (
        <div className="mt-6">{error ? <ErrorBlock message={error} onRetry={reload} /> : <LoadingBlock label="Cargando tu código…" />}</div>
      ) : (
        <section className="card mt-6 flex flex-col items-center p-6" aria-label="Código QR personal">
          <CardQr card={card} className="h-64 w-64" />
          <p className="mt-5 text-lg font-bold">{card.employee.fullName}</p>
          <p className="text-sm text-slate-500">{card.employee.code}</p>
          {card.qr && (
            <>
              <span className="mt-3">
                <Pill tone="green" icon={CheckCircle2}>
                  Credencial activa
                </Pill>
              </span>
              <p className="mt-4 text-center text-xs text-slate-500">El código se renueva solo cada pocos minutos.</p>
              <button type="button" onClick={copy} className="btn-outline mt-4 h-9 text-xs">
                <Copy size={14} aria-hidden="true" />
                {copied ? 'Copiado' : 'Copiar código'}
              </button>
            </>
          )}
        </section>
      )}
    </EmployeeShell>
  )
}
