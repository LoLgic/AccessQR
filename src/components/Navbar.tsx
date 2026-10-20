import { Link } from 'react-router-dom'
import Container from './Container'
import Logo from './Logo'
import { navLinks } from '../data/content'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <Container className="flex h-14 items-center justify-between">
        <Logo />

        <nav aria-label="Principal" className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-xs font-medium text-slate-600 transition-colors hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className="hidden text-xs font-semibold text-brand hover:text-brand-700 sm:inline">
            Iniciar sesión
          </Link>
          <Link
            to="/login"
            className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Comenzar ahora
          </Link>
        </div>
      </Container>
    </header>
  )
}
