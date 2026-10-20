import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Sidebar from '../components/app/Sidebar'
import Topbar from '../components/app/Topbar'
import { appNav, COMPANY, porteriaNav, type AppUser } from '../data/appNav'
import { useTheme } from '../hooks/useTheme'
import { initials } from '../lib/format'
import { roleLabel } from '../lib/labels'

type Variant = 'admin' | 'porteria'

const CONFIG = {
  admin: { nav: appNav, home: '/app', search: 'Buscar empleados, credenciales…' },
  porteria: { nav: porteriaNav, home: '/porteria', search: 'Buscar…' },
} as const

export default function AppLayout({ variant = 'admin' }: { variant?: Variant }) {
  const { user } = useAuth()
  const [theme, setTheme] = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const config = CONFIG[variant]

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  if (!user) return null
  const appUser: AppUser = {
    name: user.fullName,
    initials: initials(user.fullName),
    role: roleLabel[user.role],
    company: COMPANY,
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 text-ink dark:bg-slate-950 dark:text-slate-100">
        <Sidebar
          nav={config.nav}
          user={appUser}
          homePath={config.home}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          theme={theme}
          onThemeChange={setTheme}
        />

        {menuOpen && (
          <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" />
        )}

        <div className="lg:pl-[234px]">
          <Topbar nav={config.nav} user={appUser} searchPlaceholder={config.search} onMenu={() => setMenuOpen(true)} />
          <main className="px-4 py-8 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
