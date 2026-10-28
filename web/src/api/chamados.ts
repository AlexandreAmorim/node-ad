import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client'

export interface Categoria {
  id: string
  nome: string
  descricao: string | null
  parentId: string | null
  ativo: boolean
}

export interface Chamado {
  id: string
  numero: number
  titulo: string
  descricao: string
  status: string
  prioridade: string
  solicitanteUsername: string
  solicitanteNome: string | null
  atendenteUsername: string | null
  atendenteNome: string | null
  secaoId: string | null
  ouCodigo: string | null
  categoriaId: string | null
  categoria: { id: string; nome: string } | null
  criadoEm: string
  atualizadoEm: string
  comentarios?: Array<{
    id: string
    autorUsername: string
    autorNome: string | null
    texto: string
    interno: boolean
    criadoEm: string
  }>
  historico?: Array<{
    id: string
    autorUsername: string
    campo: string
    valorAnterior: string | null
    valorNovo: string | null
    criadoEm: string
  }>
  ativos?: Array<{
    id: string
    numero: number
    nome: string
    tipo: string
    status: string
    numeroPatrimonio: string | null
  }>
}

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: () => apiFetch<{ dados: Categoria[] }>('/categorias').then((r) => r.dados),
  })
}

export function useChamados(params: {
  escopo?: string
  status?: string
  busca?: string
}) {
  const qs = new URLSearchParams()
  if (params.escopo) qs.set('escopo', params.escopo)
  if (params.status) qs.set('status', params.status)
  if (params.busca) qs.set('busca', params.busca)
  const query = qs.toString()

  return useQuery({
    queryKey: ['chamados', params],
    queryFn: () =>
      apiFetch<{ dados: Chamado[] }>(`/chamados${query ? `?${query}` : ''}`).then(
        (r) => r.dados,
      ),
  })
}

export function useChamado(id: string | undefined) {
  return useQuery({
    queryKey: ['chamado', id],
    enabled: Boolean(id),
    queryFn: () =>
      apiFetch<{ chamado: Chamado }>(`/chamados/${id}`).then((r) => r.chamado),
  })
}

export function useCriarChamado() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      titulo: string
      descricao: string
      prioridade?: string
      categoriaId?: string
    }) =>
      apiFetch<{ chamado: Chamado }>('/chamados', {
        method: 'POST',
        body,
      }).then((r) => r.chamado),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamados'] }),
  })
}

export function useAtualizarChamado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      apiFetch<{ chamado: Chamado }>(`/chamados/${id}`, {
        method: 'PATCH',
        body,
      }).then((r) => r.chamado),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chamados'] })
      qc.invalidateQueries({ queryKey: ['chamado', id] })
    },
  })
}

export function useComentarChamado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { texto: string; interno?: boolean }) =>
      apiFetch(`/chamados/${id}/comentarios`, { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chamado', id] }),
  })
}
