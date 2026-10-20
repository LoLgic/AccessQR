import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import PointFormModal from '../components/app/PointFormModal'
import { ErrorBlock, LoadingBlock } from '../components/app/State'
import { IconAction, PageHeader } from '../components/app/ui'
import { useApi } from '../hooks/useApi'
import { api, ApiError } from '../lib/api'
import type { AccessPoint, SystemSettings } from '../lib/types'

type ModalState = { kind: 'create' } | { kind: 'edit'; point: AccessPoint } | null

export default function Settings() {
  const points = useApi<{ data: AccessPoint[] }>('/api/access-points')
  const system = useApi<SystemSettings>('/api/settings')
  const [modal, setModal] = useState<ModalState>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const remove = async (point: AccessPoint) => {
    if (!window.confirm(`¿Eliminar el punto de acceso "${point.name}"?`)) return
    setActionError(null)
    try {
      await api(`/api/access-points/${point.id}`, { method: 'DELETE' })
      points.reload()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo eliminar el punto de acceso.')
    }
  }

  const params: [string, string][] = system.data
    ? [
        ['Organización', system.data.company],
        ['Zona horaria', system.data.timeZone],
        ['Vigencia de cada código QR', `${system.data.qrTtlSeconds} segundos`],
        ['Ventana anti-duplicados al escanear', `${system.data.duplicateWindowSeconds} segundos`],
        ['Duración de la sesión', `${system.data.sessionTtlHours} horas (30 días con “Recordarme”)`],
      ]
    : []

  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Configuración" subtitle="Puntos de acceso y parámetros del sistema." />

      <section className="card mt-6 p-6" aria-labelledby="points-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="points-title" className="text-base font-semibold">
              Puntos de acceso
            </h2>
            <p className="mt-0.5 text-xs text-muted">Lugares donde se escanean los carnets. El guardia elige el suyo en el escáner.</p>
          </div>
          <button type="button" className="btn-primary" onClick={() => setModal({ kind: 'create' })}>
            <Plus size={16} />
            Nuevo punto
          </button>
        </div>

        {actionError && (
          <p role="alert" className="mt-4 rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-400">
            {actionError}
          </p>
        )}

        <div className="mt-5">
          {!points.data ? (
            points.error ? <ErrorBlock message={points.error} onRetry={points.reload} /> : <LoadingBlock />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {points.data.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">{p.accessCount.toLocaleString('es-CO')} accesos registrados</p>
                  </div>
                  <div className="flex gap-1.5">
                    <IconAction icon={Pencil} label={`Renombrar ${p.name}`} onClick={() => setModal({ kind: 'edit', point: p })} />
                    <IconAction icon={Trash2} label={`Eliminar ${p.name}`} onClick={() => void remove(p)} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card mt-5 p-6" aria-labelledby="system-title">
        <h2 id="system-title" className="text-base font-semibold">
          Parámetros del sistema
        </h2>
        <p className="mt-0.5 text-xs text-muted">Solo lectura: se definen con variables de entorno en el servidor (ver README).</p>
        {!system.data ? (
          <div className="mt-4">{system.error ? <ErrorBlock message={system.error} onRetry={system.reload} /> : <LoadingBlock />}</div>
        ) : (
          <dl className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {params.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-muted">{label}</dt>
                <dd className="text-right font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {modal && (
        <PointFormModal
          point={modal.kind === 'edit' ? modal.point : undefined}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null)
            points.reload()
          }}
        />
      )}
    </div>
  )
}
