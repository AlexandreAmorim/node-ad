import { ApiError, EVENTO_NAO_AUTORIZADO, tokenStore } from './client'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface UploadImagemResultado {
  success: boolean
  url: string
  /** URL absoluta pronta para <img src> */
  urlAbsoluta: string
  nome: string
  tamanho: number
  mime: string
}

/** Converte caminho relativo da API em URL absoluta para exibir imagens. */
export function urlMidia(caminho: string): string {
  if (!caminho) return ''
  if (/^https?:\/\//i.test(caminho) || caminho.startsWith('data:')) return caminho
  const base = BASE_URL.replace(/\/$/, '')
  return caminho.startsWith('/') ? `${base}${caminho}` : `${base}/${caminho}`
}

/**
 * Upload multipart de imagem (máx. 20 MB no backend).
 * Campo do form: `file`.
 */
export async function uploadImagem(file: File): Promise<UploadImagemResultado> {
  const token = tokenStore.ler()
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE_URL}/uploads/imagens`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  if (res.status === 401) {
    tokenStore.limpar()
    window.dispatchEvent(new Event(EVENTO_NAO_AUTORIZADO))
  }

  if (!res.ok) {
    let mensagem = `Falha no upload (HTTP ${res.status})`
    try {
      const corpo = (await res.json()) as { message?: string }
      if (corpo.message) mensagem = corpo.message
    } catch {
      /* ignore */
    }
    throw new ApiError(mensagem, res.status)
  }

  const dados = (await res.json()) as {
    success: boolean
    url: string
    nome: string
    tamanho: number
    mime: string
  }

  return {
    ...dados,
    urlAbsoluta: urlMidia(dados.url),
  }
}
