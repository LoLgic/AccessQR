import Container from './Container'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <Container className="flex flex-col items-start justify-between gap-3 py-6 sm:flex-row sm:items-center">
        <Logo />
        <p className="text-[11px] text-slate-500">© 2026 AccessQR · Proyecto académico — CUN Montería</p>
      </Container>
    </footer>
  )
}
