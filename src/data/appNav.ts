import {
  BarChart3,
  Clock,
  Contact,
  LayoutDashboard,
  ScanLine,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface AppNavItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface AppUser {
  name: string
  initials: string
  role: string
  company: string
}

export const appNav: AppNavItem[] = [
  { label: 'Dashboard', to: '/app', icon: LayoutDashboard },
  { label: 'Empleados', to: '/app/empleados', icon: Users },
  { label: 'Credenciales', to: '/app/credenciales', icon: Contact },
  { label: 'Escanear QR', to: '/app/escanear-qr', icon: ScanLine },
  { label: 'Historial', to: '/app/historial', icon: Clock },
  { label: 'Reportes', to: '/app/reportes', icon: BarChart3 },
  { label: 'Usuarios y roles', to: '/app/usuarios-y-roles', icon: ShieldCheck },
  { label: 'Configuración', to: '/app/configuracion', icon: Settings },
]

export const porteriaNav: AppNavItem[] = [
  { label: 'Dashboard', to: '/porteria', icon: LayoutDashboard },
  { label: 'Escanear QR', to: '/porteria/escanear', icon: ScanLine },
  { label: 'Accesos recientes', to: '/porteria/accesos', icon: Clock },
  { label: 'Historial', to: '/porteria/historial', icon: Clock },
]

export const COMPANY = 'NovaTech Solutions'
