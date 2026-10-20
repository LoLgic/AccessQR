import { useMemo } from 'react'
import { create } from 'qrcode'

interface QrCodeSvgProps {
  value: string
  label: string
  className?: string
}

const QUIET_ZONE = 2

/** QR real y escaneable, dibujado como un único <path> SVG. */
export default function QrCodeSvg({ value, label, className = '' }: QrCodeSvgProps) {
  const { size, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' })
    const n = modules.size
    let d = ''
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (modules.get(y, x)) d += `M${x} ${y}h1v1h-1z`
      }
    }
    return { size: n, path: d }
  }, [value])

  const total = size + QUIET_ZONE * 2

  return (
    <svg
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${total} ${total}`}
      className={className}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={total} height={total} fill="#FFFFFF" />
      <path d={path} fill="#0F172A" />
    </svg>
  )
}
