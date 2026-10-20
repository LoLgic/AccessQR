import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { Check, Info, X } from 'lucide-react'
import { Pill } from '../../components/app/ui'
import BigAvatar from '../../components/mobile/BigAvatar'
import { toResultView } from '../../lib/scanView'
import type { ScanResponse } from '../../lib/types'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <dt className="text-base text-slate-500">{label}</dt>
      <dd className="text-base font-semibold">{children}</dd>
    </div>
  )
}

export default function AccessResult() {
  const state = useLocation().state as ScanResponse | null
  if (!state || !state.outcome) return <Navigate to="/m/escaner" replace />

  const r = toResultView(state)
  const CtaIcon = r.cta.icon
  const tone = r.ok
    ? { circle: 'bg-green-600', title: 'text-green-700', notice: 'bg-green-100 text-green-800' }
    : { circle: 'bg-red-600', title: 'text-red-700', notice: 'bg-red-100 text-red-700' }

  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-16" role="alert">
      <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${tone.circle}`} aria-hidden="true">
        <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white text-white">
          {r.ok ? <Check size={24} strokeWidth={2.5} /> : <X size={24} strokeWidth={2.5} />}
        </span>
      </div>

      <h1 className={`mt-6 text-center text-3xl font-extrabold tracking-tight ${tone.title}`}>{r.title}</h1>

      {r.person && r.status && r.extra && (
        <section className="card mt-8 p-5" aria-label="Datos del empleado">
          <div className="flex items-center gap-4">
            <BigAvatar initials={r.person.initials} className="h-14 w-14 text-lg" />
            <div>
              <p className="text-lg font-bold">{r.person.name}</p>
              <p className="text-base text-slate-500">{r.person.role}</p>
            </div>
          </div>

          <dl className="mt-3">
            <Row label="Identificación">{r.person.document}</Row>
            <Row label="Estado">
              <Pill tone={r.status.tone} icon={r.status.icon}>
                {r.status.label}
              </Pill>
            </Row>
            <Row label="Hora">{r.time}</Row>
            <Row label={r.extraLabel ?? ''}>
              <Pill tone={r.extra.tone} icon={r.extra.icon}>
                {r.extra.label}
              </Pill>
            </Row>
          </dl>
        </section>
      )}

      <p className={`${r.person ? 'mt-5' : 'mt-8'} flex items-start gap-2.5 rounded-xl px-4 py-3.5 text-base ${tone.notice}`}>
        {r.ok ? (
          <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
        )}
        {r.notice}
      </p>

      <Link
        to="/m/escaner"
        className={`mt-auto flex h-14 items-center justify-center gap-2.5 rounded-2xl text-base font-semibold transition-colors ${
          r.ok ? 'bg-brand text-white hover:bg-brand-700' : 'border border-slate-300 bg-white hover:bg-slate-50'
        }`}
      >
        <CtaIcon size={20} aria-hidden="true" />
        {r.cta.label}
      </Link>
    </div>
  )
}
