import Container from './Container'

export default function FinalCTA() {
  return (
    <section className="bg-brand py-20 text-center text-white">
      <Container>
        <h2 className="mx-auto max-w-xl text-2xl font-bold tracking-tight sm:text-3xl">
          Moderniza el control de acceso de tu empresa.
        </h2>
        <a
          href="#"
          className="mt-8 inline-block rounded-lg bg-white px-6 py-2.5 text-xs font-semibold text-ink transition-colors hover:bg-slate-100"
        >
          Crear cuenta
        </a>
      </Container>
    </section>
  )
}
