import { ArrowRight, LogIn, ShieldCheck, XCircle, CheckCircle2 } from 'lucide-react'
import Container from './Container'
import QrMock from './QrMock'

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="text-xl font-bold leading-tight">{value}</p>
    </div>
  )
}

function ActivityRow({
  tone,
  title,
  person,
  time,
}: {
  tone: 'ok' | 'denied'
  title: string
  person: string
  time: string
}) {
  const ok = tone === 'ok'
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
        }`}
      >
        {ok ? <LogIn size={13} /> : <XCircle size={13} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold">{title}</p>
        <p className="text-[10px] text-slate-500">{person}</p>
      </div>
      <span className="text-[10px] text-slate-500">{time}</span>
    </div>
  )
}

function HeroVisual() {
  return (
    <div className="relative mx-auto h-[300px] w-full max-w-[460px] lg:mx-0 lg:ml-auto" aria-hidden="true">
      {/* Panel de actividad */}
      <div className="absolute left-0 top-4 w-[300px] rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:w-[320px]">
        <div className="flex gap-2">
          <StatBox label="Activos" value="118" />
          <StatBox label="Hoy" value="214" />
          <StatBox label="Denegados" value="3" />
        </div>
        <div className="mt-4 space-y-3">
          <ActivityRow tone="ok" title="Entrada autorizada" person="Juan Pérez" time="08:42" />
          <ActivityRow tone="denied" title="Acceso denegado" person="Carlos Rodríguez" time="09:03" />
        </div>
      </div>

      {/* Carnet digital */}
      <div className="absolute right-0 top-0 w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="bg-brand px-3 py-1.5 text-[10px] font-semibold text-white">AccessQR</div>
        <div className="flex flex-col items-center px-3 pb-4 pt-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand">
            LG
          </span>
          <p className="mt-1.5 text-xs font-semibold">Laura Gómez</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-semibold text-green-700">
            <CheckCircle2 size={9} />
            ACTIVO
          </span>
          <QrMock seed={42} className="mt-3 h-24 w-24" />
        </div>
      </div>
    </div>
  )
}

export default function Hero() {
  return (
    <section id="inicio" className="bg-slate-50">
      <Container className="grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-medium text-brand">
            <ShieldCheck size={12} />
            Plataforma web para PyMEs
          </span>

          <h1 className="mt-5 max-w-md text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Control de acceso empresarial, ahora digital.
          </h1>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-slate-600">
            Gestiona empleados, valida credenciales mediante QR y registra cada acceso desde una única plataforma.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <ArrowRight size={14} />
              Comenzar ahora
            </a>
            <a
              href="#como-funciona"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold transition-colors hover:bg-slate-50"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        <HeroVisual />
      </Container>
    </section>
  )
}
