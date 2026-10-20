import { CheckCircle2, LogIn, LogOut, Minus, RefreshCw, ScanLine, XCircle, type LucideIcon } from 'lucide-react'
import { formatDocument, formatTime, initials } from './format'
import type { Tone } from './tones'
import type { ScanResponse } from './types'

interface PillSpec {
  label: string
  tone: Tone
  icon: LucideIcon
}

export interface ScanResultView {
  ok: boolean
  title: string
  person?: { initials: string; name: string; role: string; document: string }
  status?: PillSpec
  time?: string
  extraLabel?: string
  extra?: PillSpec
  notice: string
  cta: { label: string; icon: LucideIcon }
}

const RESCAN = { label: 'Volver a escanear', icon: RefreshCw }

export function toResultView(res: ScanResponse): ScanResultView {
  if (res.outcome === 'invalid' || !res.employee) {
    return {
      ok: false,
      title: 'CÓDIGO NO VÁLIDO',
      notice: res.message ?? 'Este código no pertenece a AccessQR o la credencial fue regenerada.',
      cta: RESCAN,
    }
  }

  const { employee } = res
  const person = {
    initials: initials(employee.fullName),
    name: employee.fullName,
    role: employee.position,
    document: formatDocument(employee.document),
  }
  const status: PillSpec =
    employee.status === 'activo'
      ? { label: 'Activo', tone: 'green', icon: CheckCircle2 }
      : { label: 'Inactivo', tone: 'slate', icon: Minus }
  const time = formatTime(res.occurredAt)

  if (res.outcome === 'authorized') {
    const entry = res.movement !== 'salida'
    const label = entry ? 'Entrada' : 'Salida'
    return {
      ok: true,
      title: 'ACCESO AUTORIZADO',
      person,
      status,
      time,
      extraLabel: 'Tipo de movimiento',
      extra: { label, tone: entry ? 'blue' : 'slate', icon: entry ? LogIn : LogOut },
      notice: res.duplicate ? 'Este acceso ya se había registrado hace un momento.' : `${label} registrada correctamente.`,
      cta: { label: 'Continuar escaneando', icon: ScanLine },
    }
  }

  return {
    ok: false,
    title: 'ACCESO DENEGADO',
    person,
    status,
    time,
    extraLabel: 'Motivo',
    extra: { label: res.reason ?? 'Acceso no permitido', tone: 'red', icon: XCircle },
    notice: 'El intento quedó registrado. Consulta con un administrador si crees que es un error.',
    cta: RESCAN,
  }
}
