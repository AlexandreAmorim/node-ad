import type { ReactNode } from 'react'

interface SectionProps {
  titulo: string
  children: ReactNode
}

export function Section({ titulo, children }: SectionProps) {
  return (
    <section className="mb-[22px]">
      <h3 className="mb-3 border-b-2 border-line pb-1.5 font-display text-xs font-bold tracking-[0.09em] text-ink-soft uppercase">
        {titulo}
      </h3>
      {children}
    </section>
  )
}
