import type { Severidade } from '@/lib/prazos'

export const TEXTO_SEVERIDADE: Record<Severidade, string> = {
  danger: 'text-danger',
  warn: 'text-warn',
  ok: 'text-ok',
}

export const FUNDO_SEVERIDADE: Record<Severidade, string> = {
  danger: 'bg-danger',
  warn: 'bg-warn',
  ok: 'bg-ok',
}
