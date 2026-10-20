import Container from './Container'
import { problems } from '../data/content'

export default function Problems() {
  return (
    <section className="bg-white py-20">
      <Container>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Los sistemas tradicionales frenan a tu equipo</h2>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {problems.map(({ icon: Icon, title, description }) => (
            <li key={title} className="rounded-xl border border-slate-200 bg-white p-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Icon size={16} />
              </span>
              <h3 className="mt-4 text-xs font-semibold">{title}</h3>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{description}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
