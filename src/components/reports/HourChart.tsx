/** Accesos autorizados por hora del día (0–23). */
export default function HourChart({ data }: { data: { hour: number; count: number }[] }) {
  const counts = Array.from({ length: 24 }, (_, h) => data.find((d) => d.hour === h)?.count ?? 0)
  const max = Math.max(1, ...counts)
  const peak = counts.indexOf(Math.max(...counts))

  return (
    <div>
      <div
        role="img"
        aria-label={`Accesos por hora. Mayor movimiento a las ${peak}:00 con ${counts[peak]} accesos.`}
        className="flex h-40 items-end gap-0.5"
      >
        {counts.map((count, hour) => (
          <div key={hour} className="flex h-full flex-1 items-end" title={`${hour}:00 – ${count} accesos`}>
            <div
              className={`w-full rounded-t-sm ${count > 0 && hour === peak ? 'bg-brand' : 'bg-brand/40'}`}
              style={{ height: `${(count / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-0.5" aria-hidden="true">
        {counts.map((_, hour) => (
          <span key={hour} className="flex-1 text-center text-[10px] text-muted">
            {hour % 3 === 0 ? hour : ''}
          </span>
        ))}
      </div>
    </div>
  )
}
