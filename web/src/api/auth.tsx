import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { apiFetch, ApiError, EVENTO_NAO_AUTORIZADO, tokenStore } from './client'

export interface UsuarioSessao {
  username: string
  displayName: string
  email: string | null
  dn: string
}

interface RespostaLogin {
  success: boolean
  token: string
  user: {
    username: string
    displayName: string
    email: string | null
    dn: string
  }
}

interface ContextoAuth {
  usuario: UsuarioSessao | null
  autenticado: boolean
  entrar: (username: string, password: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<ContextoAuth | null>(null)

const CHAVE_USUARIO = 'painel-corregedoria:usuario'

function lerUsuarioSalvo(): UsuarioSessao | null {
  const bruto = sessionStorage.getItem(CHAVE_USUARIO)
  if (!bruto || !tokenStore.ler()) return null
  try {
    return JSON.parse(bruto) as UsuarioSessao
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSessao | null>(lerUsuarioSalvo)

  const sair = useCallback(() => {
    tokenStore.limpar()
    sessionStorage.removeItem(CHAVE_USUARIO)
    setUsuario(null)
  }, [])

  // O token do AD expira em 8h; quando a API devolve 401 o client emite este
  // evento e a sessão cai aqui, em vez de o usuário ver telas vazias.
  useEffect(() => {
    window.addEventListener(EVENTO_NAO_AUTORIZADO, sair)
    return () => window.removeEventListener(EVENTO_NAO_AUTORIZADO, sair)
  }, [sair])

  const entrar = useCallback(async (username: string, password: string) => {
    const resposta = await apiFetch<RespostaLogin>('/auth/login', {
      method: 'POST',
      publica: true,
      body: { username, password },
    })

    tokenStore.gravar(resposta.token)
    sessionStorage.setItem(CHAVE_USUARIO, JSON.stringify(resposta.user))
    setUsuario(resposta.user)
  }, [])

  return (
    <AuthContext value={{ usuario, autenticado: Boolean(usuario), entrar, sair }}>
      {children}
    </AuthContext>
  )
}

export function useAuth(): ContextoAuth {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

// ---------------------------------------------------------------------------
// Tela de login
// ---------------------------------------------------------------------------

export function TelaLogin() {
  const { entrar } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setErro(null)
    setEnviando(true)
    try {
      await entrar(username.trim(), password)
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? e.message
          : 'Não foi possível falar com a API. Verifique se ela está no ar.',
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card p-7">
        <div className="font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase">
          Secretaria de Governo · Rio de Janeiro
        </div>
        <h1 className="mt-1 mb-6 font-display text-xl font-extrabold text-ink">
          Painel de Gestão Correcional
        </h1>

        <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="usuario">
          Usuário de rede
        </label>
        <input
          id="usuario"
          value={username}
          autoComplete="username"
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          className="mb-4 w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink"
        />

        <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          value={password}
          autoComplete="current-password"
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enviar()}
          className="w-full rounded-md border border-line bg-paper px-3 py-2 font-mono text-sm text-ink"
        />

        {erro && (
          <p className="mt-4 rounded-md border border-danger/35 bg-danger/6 px-3 py-2 text-[12.5px] text-danger">
            {erro}
          </p>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={enviando || !username || !password}
          className="mt-5 w-full cursor-pointer rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>

        <p className="mt-4 text-[11.5px] leading-relaxed text-muted">
          Autenticação pelo Active Directory. A sessão expira em 8 horas.
        </p>
      </div>
    </div>
  )
}
