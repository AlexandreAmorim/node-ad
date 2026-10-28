import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client'

export interface Ativo {
  id: string
  numero: number
  nome: string
  tipo: string
  status: string
  numeroSerie: string | null
  numeroPatrimonio: string | null
  numeroInventario: string | null
  fabricante: { id: string; nome: string } | null
  modelo: { id: string; nome: string; tipo: string } | null
  localizacao: { id: string; nome: string; codigo: string | null } | null
  fornecedor: { id: string; nome: string } | null
  usuarioUsername: string | null
  usuarioNome: string | null
  ouCodigo: string | null
  dataAquisicao: string | null
  dataGarantia: string | null
  valor: number | null
  observacao: string | null
  specs: Record<string, unknown>
  criadoEm: string
  atualizadoEm: string
  historico?: Array<{
    id: string
    autorUsername: string
    campo: string
    valorAnterior: string | null
    valorNovo: string | null
    criadoEm: string
  }>
  chamados?: Array<{ id: string; numero: number; titulo: string; status: string }>
}

export interface CatalogoItem {
  id: string
  nome: string
  [key: string]: unknown
}

export function useAtivosResumo() {
  return useQuery({
    queryKey: ['ativos', 'resumo'],
    queryFn: () =>
      apiFetch<{
        total: number
        porStatus: Record<string, number>
        porTipo: Record<string, number>
      }>('/ativos/resumo'),
  })
}

export function useAtivos(params: {
  tipo?: string
  status?: string
  busca?: string
  ouCodigo?: string
}) {
  const qs = new URLSearchParams()
  if (params.tipo) qs.set('tipo', params.tipo)
  if (params.status) qs.set('status', params.status)
  if (params.busca) qs.set('busca', params.busca)
  if (params.ouCodigo) qs.set('ouCodigo', params.ouCodigo)
  const q = qs.toString()

  return useQuery({
    queryKey: ['ativos', params],
    queryFn: () =>
      apiFetch<{ dados: Ativo[] }>(`/ativos${q ? `?${q}` : ''}`).then((r) => r.dados),
  })
}

export function useAtivo(id: string | undefined) {
  return useQuery({
    queryKey: ['ativo', id],
    enabled: Boolean(id),
    queryFn: () => apiFetch<{ ativo: Ativo }>(`/ativos/${id}`).then((r) => r.ativo),
  })
}

export function useCriarAtivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ ativo: Ativo }>('/ativos', { method: 'POST', body }).then((r) => r.ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ativos'] })
    },
  })
}

export function useAtualizarAtivo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ ativo: Ativo }>(`/ativos/${id}`, { method: 'PATCH', body }).then((r) => r.ativo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ativos'] })
      qc.invalidateQueries({ queryKey: ['ativo', id] })
    },
  })
}

export function useFabricantes() {
  return useQuery({
    queryKey: ['fabricantes'],
    queryFn: () =>
      apiFetch<{ dados: CatalogoItem[] }>('/fabricantes').then((r) => r.dados),
  })
}

export function useModelosAtivo(tipo?: string) {
  return useQuery({
    queryKey: ['modelos-ativo', tipo],
    queryFn: () =>
      apiFetch<{ dados: CatalogoItem[] }>(
        `/modelos-ativo${tipo ? `?tipo=${tipo}` : ''}`,
      ).then((r) => r.dados),
  })
}

export function useLocalizacoes() {
  return useQuery({
    queryKey: ['localizacoes'],
    queryFn: () =>
      apiFetch<{ dados: CatalogoItem[] }>('/localizacoes').then((r) => r.dados),
  })
}

export function useVincularAtivoChamado(chamadoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ativoId: string) =>
      apiFetch(`/chamados/${chamadoId}/ativos`, {
        method: 'POST',
        body: { ativoId },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamado', chamadoId] }),
  })
}

export function useDesvincularAtivoChamado(chamadoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ativoId: string) =>
      apiFetch(`/chamados/${chamadoId}/ativos/${ativoId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamado', chamadoId] }),
  })
}
