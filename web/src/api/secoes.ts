import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiFetch } from './client'

export interface SecaoAdMap {
  id: string
  ouCodigo: string
  nome: string
  seiIdUnidade: string | null
  seiSigla: string | null
  ativo: boolean
}

export function useSecoes() {
  return useQuery({
    queryKey: ['secoes'],
    queryFn: () => apiFetch<{ dados: SecaoAdMap[] }>('/secoes').then((r) => r.dados),
  })
}

export function useCriarSecao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      ouCodigo: string
      nome: string
      seiIdUnidade?: string | null
      seiSigla?: string | null
      ativo?: boolean
    }) => apiFetch('/secoes', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secoes'] }),
  })
}

export function useAtualizarSecao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string
      ouCodigo?: string
      nome?: string
      seiIdUnidade?: string | null
      seiSigla?: string | null
      ativo?: boolean
    }) => apiFetch(`/secoes/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secoes'] }),
  })
}

export function useRemoverSecao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/secoes/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['secoes'] }),
  })
}
