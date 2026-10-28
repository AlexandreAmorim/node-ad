import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useAuth } from '@/api/auth'
import {
  useAtivos,
  useDesvincularAtivoChamado,
  useVincularAtivoChamado,
} from '@/api/ativos'
import {
  useAtualizarChamado,
  useChamado,
  useComentarChamado,
} from '@/api/chamados'
import { HtmlContent } from '@/components/HtmlContent'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

export function ChamadoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { ehAtendente, ehAdmin, usuario } = useAuth()
  const { data: chamado, isLoading, error } = useChamado(id)
  const atualizar = useAtualizarChamado(id!)
  const comentar = useComentarChamado(id!)
  const vincular = useVincularAtivoChamado(id!)
  const desvincular = useDesvincularAtivoChamado(id!)
  const { data: ativosCatalogo = [] } = useAtivos({ busca: undefined })
  const [texto, setTexto] = useState('')
  const [interno, setInterno] = useState(false)
  const [ativoSel, setAtivoSel] = useState('')

  if (isLoading) return <p className="text-sm text-muted">Carregando…</p>
  if (error || !chamado) {
    return (
      <p className="text-sm text-danger">
        {(error as Error)?.message ?? 'Chamado não encontrado'}
      </p>
    )
  }

  const podeAtender = ehAtendente || ehAdmin

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <Link
        to="/chamados"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à lista
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted">Chamado #{chamado.numero}</p>
          <h2 className="font-display text-2xl font-extrabold">{chamado.titulo}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>{chamado.status.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline">{chamado.prioridade}</Badge>
            {chamado.ouCodigo && <Badge variant="secondary">{chamado.ouCodigo}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Descrição</CardTitle>
          </CardHeader>
          <CardContent>
            <HtmlContent html={chamado.descricao} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>
              <span className="text-muted">Solicitante:</span>{' '}
              {chamado.solicitanteNome ?? chamado.solicitanteUsername}
            </p>
            <p>
              <span className="text-muted">Atendente:</span>{' '}
              {chamado.atendenteNome ?? chamado.atendenteUsername ?? '—'}
            </p>
            <p>
              <span className="text-muted">Categoria:</span>{' '}
              {chamado.categoria?.nome ?? '—'}
            </p>

            {podeAtender && (
              <div className="space-y-3 border-t border-line pt-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={chamado.status}
                    onValueChange={(status) => atualizar.mutate({ status })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        'novo',
                        'em_atendimento',
                        'aguardando_solicitante',
                        'resolvido',
                        'fechado',
                        'cancelado',
                      ].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    atualizar.mutate({
                      status: 'em_atendimento',
                      atendenteUsername: usuario?.username,
                      atendenteNome: usuario?.displayName,
                    })
                  }
                >
                  Assumir atendimento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ativos vinculados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(chamado.ativos?.length ?? 0) === 0 && (
            <p className="text-sm text-muted">Nenhum ativo vinculado a este chamado.</p>
          )}
          <ul className="space-y-2 text-sm">
            {(chamado.ativos ?? []).map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2"
              >
                <Link className="font-medium underline" to={`/ativos/${a.id}`}>
                  #{a.numero} — {a.nome}
                </Link>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{a.tipo}</Badge>
                  {podeAtender && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => desvincular.mutate(a.id)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {podeAtender && (
            <div className="flex flex-wrap items-end gap-2 border-t border-line pt-3">
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <Label>Vincular ativo do inventário</Label>
                <Select value={ativoSel || 'none'} onValueChange={(v) => setAtivoSel(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ativo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione…</SelectItem>
                    {ativosCatalogo
                      .filter((a) => !(chamado.ativos ?? []).some((v) => v.id === a.id))
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          #{a.numero} {a.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                disabled={!ativoSel || vincular.isPending}
                onClick={async () => {
                  await vincular.mutateAsync(ativoSel)
                  setAtivoSel('')
                }}
              >
                Vincular
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comentários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(chamado.comentarios ?? []).length === 0 && (
            <p className="text-sm text-muted">Nenhum comentário ainda.</p>
          )}
          {(chamado.comentarios ?? []).map((c) => (
            <div
              key={c.id}
              className="rounded-md border border-line bg-paper/60 px-4 py-3"
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-ink">
                  {c.autorNome ?? c.autorUsername}
                </span>
                <span>{new Date(c.criadoEm).toLocaleString('pt-BR')}</span>
                {c.interno && <Badge variant="warn">interno</Badge>}
              </div>
              <p className="whitespace-pre-wrap text-sm">{c.texto}</p>
            </div>
          ))}

          <div className="space-y-2 border-t border-line pt-4">
            <Textarea
              placeholder="Escreva um comentário…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
            {podeAtender && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={interno}
                  onChange={(e) => setInterno(e.target.checked)}
                />
                Comentário interno (só atendentes)
              </label>
            )}
            <Button
              disabled={!texto || comentar.isPending}
              onClick={async () => {
                await comentar.mutateAsync({ texto, interno })
                setTexto('')
                setInterno(false)
              }}
            >
              Comentar
            </Button>
          </div>
        </CardContent>
      </Card>

      {(chamado.historico?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {chamado.historico!.map((h) => (
                <li key={h.id} className="text-muted">
                  <span className="font-mono text-xs">
                    {new Date(h.criadoEm).toLocaleString('pt-BR')}
                  </span>{' '}
                  — {h.autorUsername} alterou <strong>{h.campo}</strong>:{' '}
                  {h.valorAnterior ?? '∅'} → {h.valorNovo ?? '∅'}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
