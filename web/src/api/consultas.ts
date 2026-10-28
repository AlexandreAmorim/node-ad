import { useMutation } from '@tanstack/react-query'

import { apiFetch } from './client'

export interface ConsultaPessoaBody {
  document_user: string
  document?: string
  document_secondary?: string
  name?: string
  mather?: string
  birthday?: string
}

export function useConsultaDetran() {
  return useMutation({
    mutationFn: (body: ConsultaPessoaBody) =>
      apiFetch<{ success: boolean; dados: unknown }>('/detran/person', {
        method: 'POST',
        body,
      }),
  })
}

export function useConsultaSipol() {
  return useMutation({
    mutationFn: (body: ConsultaPessoaBody) =>
      apiFetch<{ success: boolean; person: unknown }>('/sipol/person', {
        method: 'POST',
        body,
      }),
  })
}
