import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  right?: ReactNode
  children: ReactNode
  /** Padding do corpo: 'none' para tabelas que sangram até a borda. */
  bodyPadding?: 'none' | 'sm' | 'md' | 'lg'
}

const PADDINGS = {
  none: 'p-0',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-5',
} as const

export function Card({ title, right, children, bodyPadding = 'lg' }: CardProps) {
  return (
    <div className="rounded-lg border border-line bg-card">
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <span className="font-display text-[13px] font-bold tracking-[0.08em] text-ink-soft uppercase">
            {title}
          </span>
          {right}
        </div>
      )}
      <div className={PADDINGS[bodyPadding]}>{children}</div>
    </div>
  )
}
