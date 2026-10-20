import { weekdayShort } from '../../lib/format'

interface DayCount {
  day: string
  entries: number
  exits: number
}

export default function WeeklyChart({ data }: { data: DayCount[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.entries, d.exits]))
  const totalEntries = data.reduce((sum, d) => sum + d.entries, 0)
  const totalExits = data.reduce((sum, d) => sum + d.exits, 0)

  return (
    <section className="card p-6" aria-labelledby="chart-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="chart-title" className="text-base font-semibold">
            Accesos por día
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Últimos 7 días · {totalEntries} entradas, {totalExits} salidas
          </p>
        </div>
        <ul className="flex items-center gap-4 text-xs text-muted">
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

      <div
        role="img"
        aria-label={`Gráfico de barras de accesos por día. ${data
          .map((d) => `${weekdayShort(d.day)}: ${d.entries} entradas, ${d.exits} salidas`)
          .join('; ')}.`}
        className="mt-6 flex h-52 items-end justify-between gap-2 sm:gap-4"
      >
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                title={`${d.entries} entradas`}
                className="w-full max-w-[22px] rounded-t bg-brand"
                style={{ height: `${(d.entries / max) * 100}%` }}
              />
              <div
                title={`${d.exits} salidas`}
                className="w-full max-w-[22px] rounded-t bg-sky-500"
                style={{ height: `${(d.exits / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted">{weekdayShort(d.day)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
