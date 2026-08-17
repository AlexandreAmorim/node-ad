const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const CHAVE_TOKEN = 'painel-corregedoria:token'

/** Erro de API com status e detalhes de validação do Zod (formato do backend). */
export class ApiError extends Error {
  readonly status: number
  readonly detalhes?: { campo: string; mensagem: string }[]

  constructor(
    message: string,
    status: number,
    detalhes?: { campo: string; mensagem: string }[],
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detalhes = detalhes
  }
}

/**
 * Disparado quando a API responde 401 — o token de 8h do AD expirou.
 * O AuthProvider escuta e derruba a sessão.
 */
export const EVENTO_NAO_AUTORIZADO = 'painel-corregedoria:nao-autorizado'

export const tokenStore = {
  ler: () => sessionStorage.getItem(CHAVE_TOKEN),
  gravar: (token: string) => sessionStorage.setItem(CHAVE_TOKEN, token),
  limpar: () => sessionStorage.removeItem(CHAVE_TOKEN),
}

interface Opcoes extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Rotas públicas (login) não mandam Authorization. */
  publica?: boolean
}

async function extrairErro(res: Response): Promise<ApiError> {
  let corpo: Record<string, unknown> = {}
  try {
    corpo = await res.json()
  } catch {
    // resposta sem JSON (502 de proxy, HTML de erro do Nginx…)
  }

  // O backend usa `erro` nas rotas do SEI e `message` nas de auth.
  const mensagem =
    (typeof corpo.erro === 'string' && corpo.erro) ||
    (typeof corpo.message === 'string' && corpo.message) ||
    `Falha na requisição (HTTP ${res.status})`

  return new ApiError(
    mensagem,
    res.status,
    Array.isArray(corpo.detalhes) ? (corpo.detalhes as ApiError['detalhes']) : undefined,
  )
}

export async function apiFetch<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const { body, publica, headers, ...resto } = opcoes
  const token = tokenStore.ler()

  const res = await fetch(`${BASE_URL}${caminho}`, {
    ...resto,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(!publica && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status === 401 && !publica) {
    tokenStore.limpar()
    window.dispatchEvent(new Event(EVENTO_NAO_AUTORIZADO))
  }

  if (!res.ok) throw await extrairErro(res)
  if (res.status === 204) return undefined as T

  return (await res.json()) as T
}

/** O backend embrulha coleções em `{ dados }` e recursos únicos em `{ dado }`. */
export const desembrulhar = {
  lista: <T,>(r: { dados: T[] }) => r.dados,
  item: <T,>(r: { dado: T }) => r.dado,
}
