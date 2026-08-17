import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch, desembrulhar } from './client'

// ---------------------------------------------------------------------------
// Contrato da API (espelha os serializadores de src/routes/sei.routes.ts)
// ---------------------------------------------------------------------------

export interface UnidadeAberta {
  idUnidade: string
  sigla: string
  descricao: string | null
  atribuidoA: string | null
}

export interface ApiProcesso {
  id: string
  protocolo: string
  idProcedimento: string | null
  tipoProcedimento: string | null
  especificacao: string | null
  dataAutuacao: string | null
  nivelAcessoGlobal: number | null
  linkAcesso: string | null
  concluido: boolean
  unidadesAbertas: UnidadeAberta[]
  ultimoAndamento: { id: string; em: string | null; texto: string | null } | null
  ativo: boolean
  rotulo: string | null
  observacaoInterna: string | null
  sincronizadoEm: string | null
  proximaSincronizacao: string
  falhasConsecutivas: number
  ultimoErro: { mensagem: string; tipo: string | null } | null
  criadoEm: string

  /**
   * Campos correcionais que ainda não existem no schema Prisma.
   * Declarados como opcionais para o front já consumir sem quebrar quando
   * o backend passar a enviá-los.
   */
  prazoFim?: string | null
  prescricaoEm?: string | null
  fase?: string | null
}

export interface ApiAndamento {
  id: number
  idAndamento: string
  idTarefa: string | null
  descricao: string
  ocorridoEm: string
  unidade: { id: string | null; sigla: string; nome: string | null } | null
  usuario: { sigla: string; nome: string | null } | null
  atributos: Record<string, string>
}

export interface ResultadoSync {
  sucesso: boolean
  andamentosNovos: number
  mudouUnidade: boolean
  concluido: boolean
  erro?: string
  erroTipo?: string
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const chaves = {
  processos: (filtros?: FiltrosProcessos) => ['processos', filtros ?? {}] as const,
  processo: (id: string) => ['processos', id] as const,
  andamentos: (id: string) => ['processos', id, 'andamentos'] as const,
}

export interface FiltrosProcessos {
  ativo?: boolean
  concluido?: boolean
  busca?: string
  limite?: number
}

function querystring(filtros: FiltrosProcessos): string {
  const p = new URLSearchParams()
  if (filtros.ativo !== undefined) p.set('ativo', String(filtros.ativo))
  if (filtros.concluido !== undefined) p.set('concluido', String(filtros.concluido))
  if (filtros.busca) p.set('busca', filtros.busca)
  if (filtros.limite) p.set('limite', String(filtros.limite))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function useProcessos(filtros: FiltrosProcessos = { ativo: true }) {
  return useQuery({
    queryKey: chaves.processos(filtros),
    queryFn: () =>
      apiFetch<{ dados: ApiProcesso[] }>(`/processos${querystring(filtros)}`).then(
        desembrulhar.lista,
      ),
    staleTime: 60_000,
  })
}

export function useProcesso(id: string | null) {
  return useQuery({
    queryKey: chaves.processo(id ?? ''),
    queryFn: () =>
      apiFetch<{ dado: ApiProcesso }>(`/processos/${id}`).then(desembrulhar.item),
    enabled: Boolean(id),
  })
}

export function useAndamentos(id: string | null) {
  return useQuery({
    queryKey: chaves.andamentos(id ?? ''),
    queryFn: () =>
      apiFetch<{ dados: ApiAndamento[] }>(`/processos/${id}/andamentos?limite=200`).then(
        desembrulhar.lista,
      ),
    enabled: Boolean(id),
  })
}

/**
 * Dispara a sincronização com o SEI. O backend responde 502 com corpo quando
 * a chamada SOAP falha, então o erro chega como ApiError e continua exibível.
 */
export function useSincronizar() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ dado: ApiProcesso; resultado: ResultadoSync }>(
        `/processos/${id}/sincronizar`,
        { method: 'POST' },
      ),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['processos'] })
      qc.invalidateQueries({ queryKey: chaves.andamentos(id) })
    },
  })
}
