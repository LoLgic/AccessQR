/** Escapa una celda CSV y neutraliza fórmulas (=, +, -, @) que Excel ejecutaría. */
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function toCsv(rows: unknown[][]): string {
  // BOM al inicio para que Excel respete las tildes.
  return '\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
