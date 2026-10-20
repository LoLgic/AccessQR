import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Clock, Contact, Home, QrCode } from 'lucide-react'

const tabs = [
  { label: 'Inicio', to: '/m/inicio', icon: Home },
  { label: 'Mi carnet', to: '/m/carnet', icon: Contact },
  { label: 'Mi QR', to: '/m/qr', icon: QrCode },
  { label: 'Mi historial', to: '/m/historial', icon: Clock },
]

export default function EmployeeShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 px-5 pb-8 pt-12">{children}</main>

      <nav aria-label="Secciones" className="sticky bottom-0 grid grid-cols-4 border-t border-slate-200 bg-white px-2 py-2">
        {tabs.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand' : 'text-slate-500 hover:text-ink'
              }`
            }
          >
            <Icon size={22} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
