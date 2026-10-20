import { Fragment } from 'react'
import { ChevronRight } from 'lucide-react'
import Container from './Container'
import { steps } from '../data/content'

export default function HowItWorks() {
  const last = steps.length - 1

  return (
    <section id="como-funciona" className="scroll-mt-14 bg-white py-20">
      <Container>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cómo funciona</h2>

        <ol className="mt-12 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:flex lg:items-start lg:justify-between">
          {steps.map((step, index) => (
            <Fragment key={step}>
              <li className="flex flex-col items-center gap-3 text-center lg:w-28">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white ${
                    index === last ? 'bg-green-600' : 'bg-brand'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-[11px] font-semibold leading-snug">{step}</span>
              </li>
              {index < last && (
                <ChevronRight size={14} className="mt-2.5 hidden shrink-0 text-slate-400 lg:block" aria-hidden="true" />
              )}
            </Fragment>
          ))}
        </ol>
      </Container>
    </section>
  )
}
