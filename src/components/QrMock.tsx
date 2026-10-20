import { useMemo } from 'react'

const SIZE = 21

function buildMatrix(seed: number): boolean[][] {
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }

  const m: boolean[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => rnd() > 0.52),
  )

  const finder = (r: number, c: number) => {
    for (let i = -1; i <= 7; i++) {
      for (let j = -1; j <= 7; j++) {
        const rr = r + i
        const cc = c + j
        if (rr < 0 || cc < 0 || rr >= SIZE || cc >= SIZE) continue
        const edge = i === -1 || j === -1 || i === 7 || j === 7
        const ring = i === 0 || j === 0 || i === 6 || j === 6
        const core = i >= 2 && i <= 4 && j >= 2 && j <= 4
        m[rr][cc] = !edge && (ring || core)
      }
    }
  }

  finder(0, 0)
  finder(0, SIZE - 7)
  finder(SIZE - 7, 0)
  return m
}

interface QrMockProps {
  seed?: number
  className?: string
}

/** QR decorativo (no codifica datos reales). */
export default function QrMock({ seed = 127, className = '' }: QrMockProps) {
  const matrix = useMemo(() => buildMatrix(seed), [seed])

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className={`text-ink ${className}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código QR de ejemplo"
    >
      {matrix.map((row, y) =>
        row.map((on, x) => (on ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" /> : null)),
      )}
    </svg>
  )
}
