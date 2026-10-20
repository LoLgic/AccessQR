import Modal from '../app/Modal'
import { credentialLabel, employeeStatusLabel } from '../../lib/labels'
import { formatDocument, formatLastAccess } from '../../lib/format'
import type { EmployeeRow } from '../../lib/types'

export default function EmployeeDetailModal({ employee, onClose }: { employee: EmployeeRow; onClose: () => void }) {
  const rows: [string, string][] = [
    ['Nombre', employee.fullName],
    ['Código', employee.code],
    ['Identificación', formatDocument(employee.document)],
    ['Cargo', employee.position],
    ['Área', employee.area],
    ['Estado', employeeStatusLabel[employee.status]],
    ['Credencial', credentialLabel[employee.credentialStatus]],
    ['Último acceso', formatLastAccess(employee.lastAccessAt)],
  ]

  return (
    <Modal title="Detalle del empleado" onClose={onClose}>
      <dl className="mt-5 divide-y divide-slate-100 text-sm dark:divide-slate-800">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="btn-outline">
          Cerrar
        </button>
      </div>
    </Modal>
  )
}
