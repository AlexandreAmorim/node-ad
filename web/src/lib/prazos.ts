import { DATA_REFERENCIA } from '@/data/procedimentos'
import type { TipoProcedimento } from '@/types'

const UM_DIA = 86_400_000

/** Dias entre a data de referência e a data ISO informada (negativo = vencido). */
export function diasAte(dataIso: string): number {
  return Math.round((new Date(dataIso).getTime() - DATA_REFERENCIA.getTime()) / UM_DIA)
}

export function formatarData(dataIso: string): string {
  return new Date(dataIso).toLocaleDateString('pt-BR')
}

/** Abrevia o número SEI mantendo os 14 últimos caracteres. */
export function abreviarSei(sei: string): string {
  return `...${sei.slice(-14)}`
}

export function siglaTipo(tipo: TipoProcedimento | string): string {
  if (tipo === 'Investigação Preliminar') return 'IP'
  if (tipo === 'Sindicância') return 'SIND'
  return tipo
}

export type Severidade = 'danger' | 'warn' | 'ok'

/** Semáforo do prazo processual. */
export function severidadePrazo(dias: number): Severidade {
  if (dias < 0) return 'danger'
  if (dias <= 15) return 'warn'
  return 'ok'
}

/** Semáforo da prescrição (janelas mais largas que as do prazo). */
export function severidadePrescricao(dias: number): Severidade {
  if (dias <= 120) return 'danger'
  if (dias <= 270) return 'warn'
  return 'ok'
}

export function textoPrazo(dias: number): string {
  if (dias < 0) return `vencido há ${-dias}d`
  if (dias === 0) return 'vence hoje'
  return `${dias}d restantes`
}
