import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'

interface LogoProps {
  className?: string
  tone?: 'dark' | 'light'
}

export default function Logo({ className = '', tone = 'dark' }: LogoProps) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 ${className}`} aria-label="AccessQR, ir al inicio">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white">
        <ShieldCheck size={18} strokeWidth={2.2} />
      </span>
      <span className={`text-base font-semibold ${tone === 'light' ? 'text-white' : 'text-ink'}`}>AccessQR</span>
    </Link>
  )
}
