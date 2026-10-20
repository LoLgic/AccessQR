export type Role = 'admin' | 'control_acceso' | 'empleado'
export type EmployeeStatus = 'activo' | 'inactivo'
export type CredentialStatus = 'vigente' | 'inactiva' | 'por_revisar'
export type Movement = 'entrada' | 'salida'
export type AccessResultKind = 'autorizado' | 'denegado'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: Role
  employeeId: string | null
}

export interface Paged<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface EmployeeRow {
  id: string
  code: string
  fullName: string
  document: string
  position: string
  area: string
  status: EmployeeStatus
  credentialStatus: CredentialStatus
  lastAccessAt: string | null
}

export interface EmployeeFilters {
  areas: string[]
  positions: string[]
}

export interface AccessLogRow {
  id: string
  occurredAt: string
  movement: Movement
  result: AccessResultKind
  reason: string | null
  point: string
  fullName: string
  document: string
  code: string
}

export interface RecentAccess {
  id: string
  occurredAt: string
  movement: Movement
  result: AccessResultKind
  reason: string | null
  fullName: string
  position: string
}

export interface TodayStats {
  entries: number
  exits: number
  denied: number
}

export interface AdminDashboard {
  totals: { employees: number; active: number; inactive: number; credentialsToReview: number }
  today: TodayStats
  weekly: { day: string; entries: number; exits: number }[]
  recent: RecentAccess[]
}

export interface GateDashboard {
  today: TodayStats
  recent: RecentAccess[]
}

export interface ScanEmployee {
  code: string
  fullName: string
  position: string
  document: string
  status: EmployeeStatus
}

export interface ScanResponse {
  outcome: 'authorized' | 'denied' | 'invalid'
  occurredAt: string
  message?: string
  reason?: string
  movement?: Movement
  duplicate?: boolean
  employee?: ScanEmployee
}

export interface CardResponse {
  company: string
  employee: {
    code: string
    fullName: string
    document: string
    position: string
    area: string
    status: EmployeeStatus
    credentialStatus: CredentialStatus
  }
  qr: { token: string; expiresAt: string; ttlSeconds: number } | null
}

export interface MyAccess {
  id: string
  occurredAt: string
  movement: Movement
  result: AccessResultKind
  reason: string | null
  point: string
}

export interface UserRow {
  id: string
  email: string
  fullName: string
  role: Role
  isActive: boolean
  createdAt: string
  employeeId: string | null
  employeeCode: string | null
}

export interface LinkableEmployee {
  id: string
  code: string
  fullName: string
}

export interface DayCount {
  day: string
  entries: number
  exits: number
  denied: number
}

export interface ReportSummary {
  from: string
  to: string
  totals: { entries: number; exits: number; denied: number; uniqueEmployees: number }
  daily: DayCount[]
  byArea: { area: string; entries: number; exits: number; denied: number }[]
  byHour: { hour: number; count: number }[]
  denialReasons: { reason: string | null; count: number }[]
}

export interface AccessPoint {
  id: number
  name: string
  accessCount: number
}

export interface SystemSettings {
  company: string
  timeZone: string
  qrTtlSeconds: number
  sessionTtlHours: number
  duplicateWindowSeconds: number
}
