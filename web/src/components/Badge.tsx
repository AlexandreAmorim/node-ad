import type { ReactNode } from 'react'

export type BadgeTone =
  | 'ink'
  | 'inkSoft'
  | 'muted'
  | 'danger'
  | 'warn'
  | 'ok'
  | 'nexus'
  | 'onInkWarn'
  | 'onInkNexus'

const TONES: Record<BadgeTone, string> = {
  ink: 'text-ink bg-ink/6',
  inkSoft: 'text-ink-soft bg-ink-soft/8',
  muted: 'text-muted bg-paper',
  danger: 'text-danger bg-danger/8',
  warn: 'text-warn bg-warn/10',
  ok: 'text-ok bg-ok/8',
  nexus: 'text-nexus bg-nexus/9',
  onInkWarn: 'text-on-ink-warn bg-white/8',
  onInkNexus: 'text-on-ink-nexus bg-white/10',
}

interface BadgeProps {
  children: ReactNode
  tone?: BadgeTone
  className?: string
}

export function Badge({ children, tone = 'muted', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-[3px] px-2 py-[2px] font-mono text-[10.5px] font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
