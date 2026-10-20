type DateInput = string | number | Date

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const pad = (n: number) => String(n).padStart(2, '0')
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

export function formatDate(value: DateInput): string {
  const d = new Date(value)
  return `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatTime(value: DateInput): string {
  const d = new Date(value)
  const h = d.getHours()
  return `${pad(h % 12 || 12)}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`
}

export function formatLastAccess(value: string | null): string {
  if (!value) return 'Sin accesos'
  const d = new Date(value)
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000)
  if (diffDays === 0) return `Hoy ${hm}`
  if (diffDays === 1) return `Ayer ${hm}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${hm}`
}

/** "1002345678" → "1.002.345.678" */
export function formatDocument(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

/** "2026-10-16" → "Vie" */
export function weekdayShort(day: string): string {
  return WEEKDAYS[new Date(`${day}T12:00:00`).getDay()]
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
