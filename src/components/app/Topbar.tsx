import { Bell, ChevronRight, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import type { AppNavItem, AppUser } from '../../data/appNav'

interface TopbarProps {
  nav: AppNavItem[]
  user: AppUser
  searchPlaceholder: string
  onMenu: () => void
}

export default function Topbar({ nav, user, searchPlaceholder, onMenu }: TopbarProps) {
  const { pathname } = useLocation()
  const current = nav.find((item) => item.to === pathname)?.label ?? nav[0].label

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 lg:px-8">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menú"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 lg:hidden"
      >
        <Menu size={20} />
      </button>

      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm">
        <span className="hidden text-muted sm:inline">Inicio</span>
        <ChevronRight size={14} className="hidden text-slate-400 sm:block" aria-hidden="true" />
        <span className="font-semibold">{current}</span>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <label className="hidden h-10 w-72 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 focus-within:border-brand dark:border-slate-700 dark:bg-slate-800 md:flex">
          <Search size={15} className="text-slate-500" aria-hidden="true" />
          <span className="sr-only">Buscar</span>
          <input
            type="search"
            placeholder={searchPlaceholder}
            className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
        </label>

        <button
          type="button"
          aria-label="Notificaciones"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Bell size={17} />
        </button>

        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand dark:bg-brand/20 dark:text-blue-300">
            {user.initials}
          </span>
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold">{user.name}</span>
            <span className="block text-[11px] text-muted">{user.role}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
