import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { homeFor } from '../lib/labels'
import type { Role } from '../lib/types'
import { useAuth } from './AuthContext'

export const ALL_ROLES: Role[] = ['admin', 'control_acceso', 'empleado']

/** Exige sesión y uno de los roles indicados; si no, redirige al login o a la pantalla del rol. */
export default function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500" role="status">
        Cargando…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />
  return <>{children}</>
}
