import { useCallback, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Info, RefreshCw, ScanLine, X, Zap, type LucideIcon } from 'lucide-react'
import QrMock from '../../components/QrMock'
import { useApi } from '../../hooks/useApi'
import { useQrScanner, type ScannerStatus } from '../../hooks/useQrScanner'
import { api, ApiError } from '../../lib/api'
import type { AccessPoint, ScanResponse } from '../../lib/types'

interface RoundActionProps {
  icon: LucideIcon
  label: string
  onClick: () => void
  disabled?: boolean
  pressed?: boolean
}

function RoundAction({ icon: Icon, label, onClick, disabled, pressed }: RoundActionProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={pressed}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
          pressed ? 'bg-brand' : 'bg-[#1B2538] hover:bg-[#243049]'
        }`}
      >
        <Icon size={22} />
      </button>
      <span className="text-sm text-slate-200">{label}</span>
    </div>
  )
}

const hints: Record<ScannerStatus, string> = {
  idle: 'Centra el código dentro del marco',
  starting: 'Iniciando cámara…',
  scanning: 'Centra el código dentro del marco',
  denied: 'No hay permiso para usar la cámara. Actívalo en el navegador e inténtalo de nuevo.',
  unsupported: 'Este navegador no permite usar la cámara. Puedes ingresar el código a mano abajo.',
  error: 'No pudimos iniciar la cámara. Revisa que no la esté usando otra aplicación.',
}

const corner = 'absolute h-14 w-14 border-teal-500'
const POINT_KEY = 'accessqr-access-point'

function savedPoint(): string {
  try {
    return localStorage.getItem(POINT_KEY) ?? ''
  } catch {
    return ''
  }
}

export default function Scanner() {
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const busy = useRef(false)

  // El guardia elige en qué punto de acceso está; la elección se recuerda en este dispositivo.
  const points = useApi<{ data: AccessPoint[] }>('/api/access-points')
  const [pointChoice, setPointChoice] = useState(savedPoint)
  const pointList = points.data?.data ?? []
  const accessPoint = pointList.some((p) => p.name === pointChoice) ? pointChoice : (pointList[0]?.name ?? '')
  const pointRef = useRef('')
  pointRef.current = pointList.length > 1 ? accessPoint : ''
  const choosePoint = (name: string) => {
    setPointChoice(name)
    try {
      localStorage.setItem(POINT_KEY, name)
    } catch {
      /* sin almacenamiento: queda solo en memoria */
    }
  }

  // Envía el contenido del QR al servidor, que decide y registra el acceso.
  const handleDetect = useCallback(
    async (token: string) => {
      if (busy.current) return
      busy.current = true
      setProcessing(true)
      setServerError(null)
      try {
        const result = await api<ScanResponse>('/api/scan', { method: 'POST', body: { token, ...(pointRef.current ? { accessPoint: pointRef.current } : {}) } })
        navigate('/m/resultado', { state: result })
      } catch (error) {
        setServerError(error instanceof ApiError ? error.message : 'No se pudo validar el código.')
      } finally {
        busy.current = false
        setProcessing(false)
      }
    },
    [navigate],
  )

  const scanner = useQrScanner(handleDetect)
  const active = scanner.status === 'scanning' || scanner.status === 'starting'
  const problem = Boolean(serverError) || ['denied', 'unsupported', 'error'].includes(scanner.status)
  const hint = processing ? 'Validando código…' : (serverError ?? hints[scanner.status])

  const submitManual = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (manual.trim()) void handleDetect(manual.trim())
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0A101C] px-5 pb-10 pt-14 text-white">
      <h1 className="text-4xl font-bold tracking-tight">Validar acceso</h1>
      <p className="mt-2 text-base text-slate-300">Escanea el código QR del carnet digital.</p>

      {pointList.length > 1 && (
        <div className="mt-4">
          <label htmlFor="scan-point" className="mb-1.5 block text-xs text-slate-400">
            Punto de acceso
          </label>
          <select
            id="scan-point"
            value={accessPoint}
            onChange={(e) => choosePoint(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-600 bg-[#1B2538] px-3 text-sm text-white outline-none focus:border-brand"
          >
            {pointList.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="relative mx-auto mt-9 aspect-square w-full max-w-[340px] rounded-[28px] bg-[#1B2538]">
        <video
          ref={scanner.videoRef}
          muted
          playsInline
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full rounded-[28px] object-cover ${scanner.status === 'scanning' ? '' : 'hidden'}`}
        />

        <span className={`${corner} left-1 top-1 rounded-tl-[26px] border-l-4 border-t-4`} aria-hidden="true" />
        <span className={`${corner} right-1 top-1 rounded-tr-[26px] border-r-4 border-t-4`} aria-hidden="true" />
        <span className={`${corner} bottom-1 left-1 rounded-bl-[26px] border-b-4 border-l-4`} aria-hidden="true" />
        <span className={`${corner} bottom-1 right-1 rounded-br-[26px] border-b-4 border-r-4`} aria-hidden="true" />

        {scanner.status !== 'scanning' && (
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-slate-500/70 p-3"
            aria-hidden="true"
          >
            <QrMock seed={127} className="h-32 w-32" />
          </div>
        )}

        <span
          className="absolute left-[8%] right-[8%] top-1/2 h-0.5 rounded bg-teal-500 motion-safe:animate-scan"
          aria-hidden="true"
        />
      </div>

      <p
        role="status"
        className={`mt-5 flex items-start justify-center gap-2 text-center text-sm ${problem ? 'text-amber-300' : 'text-slate-200'}`}
      >
        <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        {hint}
      </p>

      <div className="mt-8 flex justify-between px-3">
        <RoundAction
          icon={Zap}
          label="Flash"
          onClick={scanner.toggleTorch}
          disabled={!scanner.torchSupported}
          pressed={scanner.torchOn}
        />
        <RoundAction icon={RefreshCw} label="Cambiar cámara" onClick={scanner.switchCamera} />
        <RoundAction icon={HelpCircle} label="Ayuda" onClick={() => setHelpOpen((v) => !v)} pressed={helpOpen} />
      </div>

      {helpOpen && (
        <ul className="mt-5 list-disc space-y-1.5 rounded-xl bg-[#1B2538] py-4 pl-9 pr-4 text-sm text-slate-200">
          <li>Sostén el carnet a unos 15–25 cm de la cámara.</li>
          <li>Evita reflejos sobre la pantalla del celular del empleado.</li>
          <li>Con poca luz, activa el flash (si tu dispositivo lo permite).</li>
        </ul>
      )}

      <div className="mt-auto pt-10">
        {active ? (
          <button
            type="button"
            onClick={scanner.cancel}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl border border-slate-600 text-base font-semibold transition-colors hover:bg-white/5"
          >
            <X size={20} aria-hidden="true" />
            Cancelar escaneo
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void scanner.start(scanner.facing)}
            disabled={processing}
            className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-brand text-base font-semibold transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            <ScanLine size={20} aria-hidden="true" />
            Escanear código QR
          </button>
        )}

        <details className="mt-5 text-sm">
          <summary className="cursor-pointer text-center text-xs text-slate-400 hover:text-slate-200">
            ¿Sin cámara? Ingresar el código a mano
          </summary>
          <form onSubmit={submitManual} className="mt-3 flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="aq1.NT-00127…"
              aria-label="Código del QR"
              autoComplete="off"
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-600 bg-[#1B2538] px-3 text-sm outline-none placeholder:text-slate-500 focus:border-brand"
            />
            <button type="submit" disabled={processing} className="rounded-xl bg-[#243049] px-4 text-sm font-semibold hover:bg-[#2c3a59] disabled:opacity-60">
              Validar
            </button>
          </form>
        </details>
      </div>
    </div>
  )
}
