import type { AccessResultKind, CredentialStatus, EmployeeStatus, Movement, Role } from './types'

export const roleLabel: Record<Role, string> = {
  admin: 'Administrador',
  control_acceso: 'Control de acceso',
  empleado: 'Empleado',
}

export const employeeStatusLabel: Record<EmployeeStatus, string> = { activo: 'Activo', inactivo: 'Inactivo' }
export const credentialLabel: Record<CredentialStatus, string> = {
  vigente: 'Vigente',
  inactiva: 'Inactiva',
  por_revisar: 'Por revisar',
}
export const movementLabel: Record<Movement, string> = { entrada: 'Entrada', salida: 'Salida' }
export const resultLabel: Record<AccessResultKind, string> = { autorizado: 'Autorizado', denegado: 'Denegado' }

/** Pantalla de inicio de cada rol. */
export function homeFor(role: Role): string {
  if (role === 'admin') return '/app'
  if (role === 'control_acceso') return '/porteria'
  return '/m/inicio'
}

export function activityTitle(item: { movement: Movement; result: AccessResultKind }): string {
  if (item.result === 'denegado') return 'Acceso denegado'
  return item.movement === 'entrada' ? 'Entrada autorizada' : 'Salida registrada'
}
