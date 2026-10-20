import Container from './Container'
import { features } from '../data/content'

export default function Features() {
  return (
    <section className="bg-slate-50 py-20">
      <Container>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Todo lo que necesitas para controlar el acceso</h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-xl border border-slate-200 bg-white p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <Icon size={16} />
              </span>
              <h3 className="mt-4 text-sm font-semibold">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
