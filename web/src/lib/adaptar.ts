import type { ApiProcesso } from '@/api/processos'
import { diasAte } from './prazos'

/**
 * Linha do painel montada a partir da API.
 *
 * Difere do tipo `Procedimento` do protótipo em dois pontos: `prazoFim` e
 * `prescricao` podem ser nulos (o schema do backend ainda não tem esses
 * campos), e `unidade` vira lista porque um processo pode estar aberto em
 * mais de uma unidade ao mesmo tempo.
 */
export interface ProcessoPainel {
  id: string
  sei: string
  tipo: string
  especificacao: string | null
  unidades: string[]
  concluido: boolean
  linkAcesso: string | null

  ultimoAndamentoTexto: string | null
  ultimoAndamentoEm: Date | null

  /** null enquanto o backend não persistir controle de prazo. */
  prazoFim: string | null
  dias: number | null
  prescricao: string | null
  diasPresc: number | null
  fase: string | null

  sincronizadoEm: Date | null
  erro: { mensagem: string; tipo: string | null } | null
  falhasConsecutivas: number
}

const data = (iso: string | null | undefined): Date | null =>
  iso ? new Date(iso) : null

export function adaptarProcesso(p: ApiProcesso): ProcessoPainel {
  const prazoFim = p.prazoFim ?? null
  const prescricao = p.prescricaoEm ?? null

  return {
    id: p.id,
    sei: p.protocolo,
    tipo: p.tipoProcedimento ?? '—',
    especificacao: p.especificacao,
    unidades: p.unidadesAbertas.map((u) => u.sigla),
    concluido: p.concluido,
    linkAcesso: p.linkAcesso,

    ultimoAndamentoTexto: p.ultimoAndamento?.texto ?? null,
    ultimoAndamentoEm: data(p.ultimoAndamento?.em),

    prazoFim,
    dias: prazoFim ? diasAte(prazoFim) : null,
    prescricao,
    diasPresc: prescricao ? diasAte(prescricao) : null,
    fase: p.fase ?? null,

    sincronizadoEm: data(p.sincronizadoEm),
    erro: p.ultimoErro,
    falhasConsecutivas: p.falhasConsecutivas,
  }
}

/** Situação derivada do que a API entrega — o SEI não expõe um campo direto. */
export function situacaoDe(p: ProcessoPainel): string {
  if (p.concluido) return 'Concluído'
  if (p.unidades.length > 1) return `Aberto em ${p.unidades.length} unidades`
  return 'Em andamento'
}

export function formatarDataHora(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
