import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

import { useAuth } from '@/api/auth'
import { useProcessos, useSincronizar } from '@/api/processos'
import { adaptarProcesso } from '@/lib/adaptar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FichaCaso } from '@/features/mesa/FichaCaso'

export function SeiPage() {
  const { usuario, ehAdmin } = useAuth()
  const [busca, setBusca] = useState('')
  const [casoSel, setCasoSel] = useState<string | null>(null)
  const [todasSecoes, setTodasSecoes] = useState(false)

  const { data: processosApi, isLoading, error, refetch, isFetching } = useProcessos({
    ativo: true,
    busca: busca || undefined,
    todasSecoes: ehAdmin && todasSecoes ? 'true' : undefined,
  })
  const sincronizar = useSincronizar()

  const processos = (processosApi ?? []).map(adaptarProcesso)
  const secao = usuario?.secao ?? '—'
  const sigla = usuario?.seiUnidade?.sigla

  if (casoSel) {
    return (
      <div className="mx-auto max-w-shell space-y-4">
        <Button variant="secondary" size="sm" onClick={() => setCasoSel(null)}>
          ← Voltar aos processos
        </Button>
        <FichaCaso processoId={casoSel} />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">SEI</h2>
          <p className="text-sm text-muted">
            Processos da seção <strong>{secao}</strong>
            {sigla ? ` (${sigla})` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ehAdmin && (
            <label className="flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={todasSecoes}
                onChange={(e) => setTodasSecoes(e.target.checked)}
              />
              Ver todas as seções
            </label>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {!usuario?.seiUnidade && (
        <Card className="border-warn/40 bg-warn/5">
          <CardContent className="py-4 text-sm text-warn">
            Sua OU ainda não está mapeada a uma unidade SEI. Peça ao admin para cadastrar{' '}
            <strong>{usuario?.secao ?? 'sua seção'}</strong> em Admin → Seções.
          </CardContent>
        </Card>
      )}

      <Input
        className="max-w-md"
        placeholder="Buscar protocolo, rótulo ou especificação"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />

      <Card>
        <CardHeader>
          <CardTitle>Meus processos</CardTitle>
          <CardDescription>
            Acompanhamento persistido, filtrado pela unidade SEI da sua seção
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted">Carregando…</p>}
          {error && (
            <p className="p-6 text-sm text-danger">{(error as Error).message}</p>
          )}
          {!isLoading && processos.length === 0 && (
            <p className="p-6 text-sm text-muted">Nenhum processo nesta seção.</p>
          )}
          {processos.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Protocolo</th>
                  <th className="px-4 py-3">Tipo / especificação</th>
                  <th className="px-4 py-3">Unidades</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {processos.map((p) => (
                  <tr key={p.id} className="border-b border-line/70 hover:bg-paper/80">
                    <td className="px-4 py-3 font-mono text-xs">{p.sei}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.tipo}</p>
                      <p className="text-xs text-muted">{p.especificacao ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {p.unidades.join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.concluido ? 'ok' : 'warn'}>
                        {p.concluido ? 'concluído' : 'aberto'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setCasoSel(p.id)}>
                          Abrir
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={sincronizar.isPending}
                          onClick={() => sincronizar.mutate(p.id)}
                        >
                          Sync
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
