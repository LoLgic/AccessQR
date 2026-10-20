import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { HelpCircle, KeyRound, LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import ChangePasswordModal from '../account/ChangePasswordModal'
import type { AppNavItem, AppUser } from '../../data/appNav'
import type { Theme } from '../../hooks/useTheme'

interface SidebarProps {
  nav: AppNavItem[]
  user: AppUser
  homePath: string
  open: boolean
  onClose: () => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

const itemBase =
  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors'

export default function Sidebar({ nav, user, homePath, open, onClose, theme, onThemeChange }: SidebarProps) {
  const { logout } = useAuth()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const navigate = useNavigate()
  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const themeBtn = (value: Theme, label: string, Icon: typeof Sun) => (
    <button
      type="button"
      onClick={() => onThemeChange(value)}
      aria-pressed={theme === value}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-colors ${
        theme === value ? 'bg-brand text-white' : 'text-slate-300 hover:text-white'
      }`}
    >
      <Icon size={13} />
      {label}
    </button>
  )

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-[234px] flex-col bg-ink px-3.5 py-5 text-white transition-transform motion-reduce:transition-none lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <Link to={homePath} onClick={onClose} className="mb-6 flex items-center gap-2.5 px-1.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand">
          <ShieldCheck size={18} strokeWidth={2.2} />
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">AccessQR</span>
          <span className="block text-[11px] text-slate-400">{user.company}</span>
        </span>
      </Link>

      <nav aria-label="Navegación principal" className="flex-1 space-y-1 overflow-y-auto">
        {nav.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === homePath}
            onClick={onClose}
            className={({ isActive }) =>
              `${itemBase} ${isActive ? 'bg-brand text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 pt-4">
        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          className={`${itemBase} text-slate-300 hover:bg-white/5 hover:text-white`}
        >
          <KeyRound size={17} />
          Cambiar contraseña
        </button>
        <button type="button" className={`${itemBase} text-slate-300 hover:bg-white/5 hover:text-white`}>
          <HelpCircle size={17} />
          Ayuda
        </button>
        <button
          type="button"
          onClick={handleLogout}
          className={`${itemBase} text-slate-300 hover:bg-white/5 hover:text-white`}
        >
          <LogOut size={17} />
          Cerrar sesión
        </button>

        <div className="flex gap-1 rounded-lg bg-slate-800 p-1" role="group" aria-label="Tema de color">
          {themeBtn('light', 'Light', Sun)}
          {themeBtn('dark', 'Dark', Moon)}
        </div>

        <div className="flex items-center gap-2.5 px-1.5 pt-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
            {user.initials}
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{user.name}</span>
            <span className="block text-[11px] text-slate-400">{user.role}</span>
          </span>
        </div>
      </div>
      {passwordOpen && <ChangePasswordModal onClose={() => setPasswordOpen(false)} />}
    </aside>
  )
}
