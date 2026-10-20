import Container from './Container'
import { pillars } from '../data/content'

export default function Solution() {
  return (
    <section id="producto" className="scroll-mt-14 bg-slate-50 py-20">
      <Container>
        <p className="text-xs font-semibold text-brand">AccessQR</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Una sola plataforma para identificar, validar y controlar
        </h2>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <Icon size={20} />
              </span>
              <h3 className="mt-6 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-500">{description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
