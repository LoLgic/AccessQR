import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Logo from './Logo'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

/** Contenedor de las pantallas públicas de cuenta (recuperar y restablecer contraseña). */
export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 py-12 text-ink">
      <div className="w-full max-w-sm">
        <Logo className="mb-8" />
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        <Link to="/login" className="mt-8 inline-block text-xs font-medium text-slate-500 hover:text-ink">
          Volver a iniciar sesión
        </Link>
      </div>
    </main>
  )
}
