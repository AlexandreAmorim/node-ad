import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useAuth } from '@/api/auth'
import { useAtivo, useAtualizarAtivo } from '@/api/ativos'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AtivoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { ehAdmin } = useAuth()
  const { data: ativo, isLoading, error } = useAtivo(id)
  const atualizar = useAtualizarAtivo(id!)

  if (isLoading) return <p className="text-sm text-muted">Carregando…</p>
  if (error || !ativo) {
    return (
      <p className="text-sm text-danger">
        {(error as Error)?.message ?? 'Ativo não encontrado'}
      </p>
    )
  }

  const podeGerir = ehAdmin

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <Link
        to="/ativos"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao inventário
      </Link>

      <div>
        <p className="font-mono text-xs text-muted">Ativo #{ativo.numero}</p>
        <h2 className="font-display text-2xl font-extrabold">{ativo.nome}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge>{ativo.tipo}</Badge>
          <Badge variant="outline">{ativo.status.replace(/_/g, ' ')}</Badge>
          {ativo.ouCodigo && <Badge variant="secondary">{ativo.ouCodigo}</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Campo rotulo="Patrimônio" valor={ativo.numeroPatrimonio} mono />
            <Campo rotulo="Nº série" valor={ativo.numeroSerie} mono />
            <Campo rotulo="Inventário" valor={ativo.numeroInventario} mono />
            <Campo
              rotulo="Fabricante / modelo"
              valor={
                [ativo.fabricante?.nome, ativo.modelo?.nome].filter(Boolean).join(' · ') || null
              }
            />
            <Campo rotulo="Localização" valor={ativo.localizacao?.nome} />
            <Campo
              rotulo="Usuário"
              valor={ativo.usuarioNome ?? ativo.usuarioUsername}
            />
            <Campo
              rotulo="Aquisição"
              valor={
                ativo.dataAquisicao
                  ? new Date(ativo.dataAquisicao).toLocaleDateString('pt-BR')
                  : null
              }
            />
            <Campo
              rotulo="Garantia até"
              valor={
                ativo.dataGarantia
                  ? new Date(ativo.dataGarantia).toLocaleDateString('pt-BR')
                  : null
              }
            />
            {ativo.observacao && (
              <div className="sm:col-span-2">
                <Campo rotulo="Observação" valor={ativo.observacao} />
              </div>
            )}
            {Object.keys(ativo.specs ?? {}).length > 0 && (
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs text-muted">Especificações</p>
                <pre className="rounded-md bg-paper p-3 font-mono text-xs">
                  {JSON.stringify(ativo.specs, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {podeGerir ? (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={ativo.status}
                  onValueChange={(status) => atualizar.mutate({ status })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['em_estoque', 'em_uso', 'em_manutencao', 'reservado', 'descartado'].map(
                      (s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted">Somente leitura</p>
            )}

            {(ativo.chamados?.length ?? 0) > 0 && (
              <div className="border-t border-line pt-3">
                <p className="mb-2 text-xs font-semibold text-muted uppercase">
                  Chamados vinculados
                </p>
                <ul className="space-y-1 text-sm">
                  {ativo.chamados!.map((c) => (
                    <li key={c.id}>
                      <Link className="underline" to={`/chamados/${c.id}`}>
                        #{c.numero} — {c.titulo}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(ativo.historico?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {ativo.historico!.map((h) => (
                <li key={h.id} className="text-muted">
                  <span className="font-mono text-xs">
                    {new Date(h.criadoEm).toLocaleString('pt-BR')}
                  </span>{' '}
                  — {h.autorUsername}: <strong>{h.campo}</strong> {h.valorAnterior ?? '∅'} →{' '}
                  {h.valorNovo ?? '∅'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Campo({
  rotulo,
  valor,
  mono,
}: {
  rotulo: string
  valor: string | null | undefined
  mono?: boolean
}) {
  return (
    <div>
      <p className="text-xs text-muted">{rotulo}</p>
      <p className={mono ? 'font-mono text-sm' : 'text-sm font-medium'}>{valor || '—'}</p>
    </div>
  )
}
