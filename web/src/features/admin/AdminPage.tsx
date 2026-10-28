import { useState } from 'react'

import {
  useAtualizarSecao,
  useCriarSecao,
  useRemoverSecao,
  useSecoes,
} from '@/api/secoes'
import { useCategorias } from '@/api/chamados'
import { apiFetch } from '@/api/client'
import { useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function AdminPage() {
  const { data: secoes = [], isLoading } = useSecoes()
  const { data: categorias = [] } = useCategorias()
  const criarSecao = useCriarSecao()
  const atualizarSecao = useAtualizarSecao()
  const removerSecao = useRemoverSecao()
  const qc = useQueryClient()

  const [ouCodigo, setOuCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [seiIdUnidade, setSeiIdUnidade] = useState('')
  const [seiSigla, setSeiSigla] = useState('')

  const [catNome, setCatNome] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catMsg, setCatMsg] = useState<string | null>(null)

  async function criarCategoria() {
    setCatMsg(null)
    await apiFetch('/categorias', {
      method: 'POST',
      body: { nome: catNome, descricao: catDesc || undefined },
    })
    setCatNome('')
    setCatDesc('')
    setCatMsg('Categoria criada')
    qc.invalidateQueries({ queryKey: ['categorias'] })
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div>
        <h2 className="font-display text-2xl font-extrabold">Administração</h2>
        <p className="text-sm text-muted">
          Mapeamento OU do Active Directory ↔ unidade SEI e categorias de chamado
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seções (OU ↔ SEI)</CardTitle>
          <CardDescription>
            Ex.: OU=ASSTIC no DN → unidade SEI SEGOV/ASSTIC
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Código OU</Label>
              <Input
                className="font-mono uppercase"
                value={ouCodigo}
                onChange={(e) => setOuCodigo(e.target.value)}
                placeholder="ASSTIC"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IdUnidade SEI</Label>
              <Input
                className="font-mono"
                value={seiIdUnidade}
                onChange={(e) => setSeiIdUnidade(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sigla SEI</Label>
              <Input
                className="font-mono"
                value={seiSigla}
                onChange={(e) => setSeiSigla(e.target.value)}
                placeholder="SEGOV/ASSTIC"
              />
            </div>
          </div>
          <Button
            disabled={!ouCodigo || !nome || criarSecao.isPending}
            onClick={() =>
              criarSecao.mutate({
                ouCodigo,
                nome,
                seiIdUnidade: seiIdUnidade || null,
                seiSigla: seiSigla || null,
              })
            }
          >
            Adicionar seção
          </Button>
          {criarSecao.isError && (
            <p className="text-sm text-danger">{(criarSecao.error as Error).message}</p>
          )}

          {isLoading && <p className="text-sm text-muted">Carregando…</p>}
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2">OU</th>
                <th className="py-2">Nome</th>
                <th className="py-2">SEI</th>
                <th className="py-2">Status</th>
                <th className="py-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {secoes.map((s) => (
                <tr key={s.id} className="border-b border-line/60">
                  <td className="py-2.5 font-mono text-xs">{s.ouCodigo}</td>
                  <td className="py-2.5">{s.nome}</td>
                  <td className="py-2.5 font-mono text-xs">
                    {s.seiSigla ?? '—'}
                    {s.seiIdUnidade ? ` (#${s.seiIdUnidade})` : ''}
                  </td>
                  <td className="py-2.5">
                    <Badge variant={s.ativo ? 'ok' : 'secondary'}>
                      {s.ativo ? 'ativo' : 'inativo'}
                    </Badge>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          atualizarSecao.mutate({ id: s.id, ativo: !s.ativo })
                        }
                      >
                        {s.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm(`Remover seção ${s.ouCodigo}?`)) {
                            removerSecao.mutate(s.id)
                          }
                        }}
                      >
                        Remover
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categorias de chamado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={catNome} onChange={(e) => setCatNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
            </div>
          </div>
          <Button disabled={!catNome} onClick={criarCategoria}>
            Nova categoria
          </Button>
          {catMsg && <p className="text-sm text-ok">{catMsg}</p>}

          <ul className="space-y-1 text-sm">
            {categorias.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <Badge variant="outline">{c.nome}</Badge>
                <span className="text-muted">{c.descricao}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
