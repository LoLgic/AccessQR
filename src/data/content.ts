import {
  BarChart3,
  CheckCircle2,
  Clock,
  Contact,
  Lock,
  Pencil,
  QrCode,
  ScanLine,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  label: string
  href: string
}

export interface IconItem {
  icon: LucideIcon
  title: string
  description?: string
}

export const navLinks: NavLink[] = [
  { label: 'Producto', href: '#producto' },
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Seguridad', href: '#seguridad' },
]

export const problems: Required<IconItem>[] = [
  {
    icon: Contact,
    title: 'Carnets físicos',
    description: 'Se pierden, se deterioran o se duplican.',
  },
  {
    icon: Pencil,
    title: 'Registros manuales',
    description: 'Errores de digitación y datos ilegibles.',
  },
  {
    icon: Clock,
    title: 'Verificación lenta',
    description: 'Filas en portería por inspección visual.',
  },
  {
    icon: BarChart3,
    title: 'Falta de trazabilidad',
    description: 'Sin historial consultable en tiempo real.',
  },
  {
    icon: Lock,
    title: 'Credenciales difíciles de actualizar',
    description: 'Dar de baja depende de recoger el plástico.',
  },
]

export const pillars: Required<IconItem>[] = [
  { icon: Contact, title: 'Identifica', description: 'Carnet digital único.' },
  { icon: ScanLine, title: 'Valida', description: 'Escaneo QR rápido.' },
  { icon: Clock, title: 'Controla', description: 'Historial centralizado.' },
]

export const steps: string[] = [
  'Registrar empleado',
  'Generar carnet digital',
  'Asignar QR',
  'Escanear credencial',
  'Validar identidad',
  'Registrar entrada/salida',
]

export const features: Required<IconItem>[] = [
  {
    icon: Users,
    title: 'Gestión de empleados',
    description: 'Registra, consulta y actualiza el estado de tu personal.',
  },
  {
    icon: Contact,
    title: 'Carnet digital',
    description: 'Cada empleado cuenta con su carnet en el celular.',
  },
  {
    icon: QrCode,
    title: 'Código QR',
    description: 'Un código único asociado a cada empleado.',
  },
  {
    icon: CheckCircle2,
    title: 'Validación en tiempo real',
    description: 'Verifica el estado de la credencial al escanear.',
  },
  {
    icon: Clock,
    title: 'Historial de accesos',
    description: 'Consulta entradas y salidas con filtros por fecha o empleado.',
  },
  {
    icon: ShieldCheck,
    title: 'Roles y permisos',
    description: 'Administrador, control de acceso y empleado.',
  },
]

export const securityItems: IconItem[] = [
  { icon: QrCode, title: 'Credenciales únicas' },
  { icon: CheckCircle2, title: 'Estados activo/inactivo' },
  { icon: ScanLine, title: 'Validación' },
  { icon: Clock, title: 'Trazabilidad' },
  { icon: Settings, title: 'Control centralizado' },
]
