import type { Severidade } from '@/lib/prazos'

interface KpiProps {
  label: string
  value: number | string
  sub?: string
  tone?: Severidade | 'neutro'
}

const TONES = {
  neutro: 'text-ink',
  danger: 'text-danger',
  warn: 'text-warn',
  ok: 'text-ok',
} as const

export function Kpi({ label, value, sub, tone = 'neutro' }: KpiProps) {
  return (
    <div className="min-w-[165px] flex-1 rounded-lg border border-line bg-card px-5 py-[18px]">
      <div className="text-xs font-medium text-muted">{label}</div>
      <div
        className={`mt-1 font-display text-[33px] leading-[1.15] font-extrabold ${TONES[tone]}`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}
