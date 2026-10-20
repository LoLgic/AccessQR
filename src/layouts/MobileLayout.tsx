import { Outlet } from 'react-router-dom'

/** Columna de ancho móvil, centrada cuando se abre en escritorio. */
export default function MobileLayout() {
  return (
    <div className="min-h-screen bg-slate-200">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-slate-50 text-ink shadow-xl">
        <Outlet />
      </div>
    </div>
  )
}
