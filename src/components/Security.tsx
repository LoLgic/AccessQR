import Container from './Container'
import { securityItems } from '../data/content'

export default function Security() {
  return (
    <section id="seguridad" className="scroll-mt-14 bg-ink py-20 text-white">
      <Container>
        <p className="text-xs text-slate-300">Seguridad y control</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Cada acceso, validado y registrado</h2>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {securityItems.map(({ icon: Icon, title }) => (
            <li key={title} className="rounded-xl bg-slate-800/80 p-4">
              <Icon size={18} className="text-teal-400" />
              <p className="mt-4 text-xs font-semibold">{title}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
