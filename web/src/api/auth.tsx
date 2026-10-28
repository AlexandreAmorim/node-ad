import {
  createContext,
  use,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import { apiFetch, ApiError, EVENTO_NAO_AUTORIZADO, tokenStore } from './client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export interface SeiUnidadeSessao {
  idUnidade: string
  sigla: string
}

export interface UsuarioSessao {
  username: string
  displayName: string
  email: string | null
  dn: string
  secao?: string | null
  secaoId?: string | null
  ouPath?: string | null
  seiUnidade?: SeiUnidadeSessao | null
  papeis?: string[]
}

interface RespostaLogin {
  success: boolean
  token: string
  user: UsuarioSessao
}

interface ContextoAuth {
  usuario: UsuarioSessao | null
  autenticado: boolean
  ehAdmin: boolean
  ehAtendente: boolean
  entrar: (username: string, password: string) => Promise<void>
  sair: () => void
}

const AuthContext = createContext<ContextoAuth | null>(null)

const CHAVE_USUARIO = 'portal-segov:usuario'

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

  const papeis = usuario?.papeis ?? []

  return (
    <AuthContext
      value={{
        usuario,
        autenticado: Boolean(usuario),
        ehAdmin: papeis.includes('admin'),
        ehAtendente: papeis.includes('atendente') || papeis.includes('admin'),
        entrar,
        sair,
      }}
    >
      {children}
    </AuthContext>
  )
}

export function useAuth(): ContextoAuth {
  const ctx = use(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}

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
      <Card className="w-full max-w-sm border-line/40">
        <CardHeader>
          <p className="font-mono text-[10.5px] tracking-[0.18em] text-muted uppercase">
            Secretaria de Governo · Rio de Janeiro
          </p>
          <CardTitle>Portal SEGOV</CardTitle>
          <CardDescription>
            Helpdesk, SEI por seção e consultas institucionais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="usuario">Usuário de rede</Label>
              <Input
                id="usuario"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senha">Senha</Label>
              <Input
                id="senha"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviar()}
                className="font-mono"
              />
            </div>

            {erro && (
              <p className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2 text-[12.5px] text-danger">
                {erro}
              </p>
            )}

            <Button
              type="button"
              onClick={enviar}
              disabled={enviando || !username || !password}
              className="w-full"
            >
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>

            <p className="text-[11.5px] leading-relaxed text-muted">
              Autenticação pelo Active Directory. A seção SEI é resolvida pela OU do seu DN.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
