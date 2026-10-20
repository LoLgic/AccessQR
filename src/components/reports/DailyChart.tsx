import type { DayCount } from '../../lib/types'

const label = (day: string) => `${day.slice(8)}/${day.slice(5, 7)}`

export default function DailyChart({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.entries, d.exits]))
  const step = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div>
      <div
        role="img"
        aria-label={`Accesos por día entre ${data[0] ? label(data[0].day) : ''} y ${data.length ? label(data[data.length - 1].day) : ''}.`}
        className="flex h-48 items-end gap-px sm:gap-0.5"
      >
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 items-end justify-center gap-px" title={`${label(d.day)}: ${d.entries} entradas, ${d.exits} salidas, ${d.denied} denegados`}>
            <div className="w-full max-w-[10px] rounded-t-sm bg-brand" style={{ height: `${(d.entries / max) * 100}%` }} />
            <div className="w-full max-w-[10px] rounded-t-sm bg-sky-500" style={{ height: `${(d.exits / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-px sm:gap-0.5" aria-hidden="true">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 text-center text-[10px] text-muted">
            {i % step === 0 ? label(d.day) : ''}
          </span>
        ))}
      </div>
      <ul className="mt-4 flex items-center gap-4 text-xs text-muted">
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
          Entradas
        </li>
        <li className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
          Salidas
        </li>
      </ul>
    </div>
  )
}
