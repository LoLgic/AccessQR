export function LoadingBlock({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="card p-10 text-center text-sm text-muted" role="status">
      {label}
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-8 text-center" role="alert">
      <p className="text-sm font-semibold text-red-600 dark:text-red-400">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline mt-4">
          Reintentar
        </button>
      )}
    </div>
  )
}
