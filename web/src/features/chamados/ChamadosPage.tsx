import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

import { useAuth } from '@/api/auth'
import {
  useCategorias,
  useChamados,
  useCriarChamado,
} from '@/api/chamados'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/RichTextEditor'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'ok' | 'warn' | 'danger'> = {
  novo: 'warn',
  em_atendimento: 'default',
  aguardando_solicitante: 'secondary',
  resolvido: 'ok',
  fechado: 'secondary',
  cancelado: 'danger',
}

export function ChamadosPage() {
  const { ehAtendente, ehAdmin } = useAuth()
  const [escopo, setEscopo] = useState(ehAtendente || ehAdmin ? 'secao' : 'meus')
  const [busca, setBusca] = useState('')
  const [abrirForm, setAbrirForm] = useState(false)

  const { data: chamados = [], isLoading, error } = useChamados({ escopo, busca: busca || undefined })
  const { data: categorias = [] } = useCategorias()
  const criar = useCriarChamado()

  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [prioridade, setPrioridade] = useState('media')
  const [categoriaId, setCategoriaId] = useState<string>('')

  function descricaoPreenchida(html: string) {
    const texto = html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').trim()
    return texto.length >= 3 || /<img\s/i.test(html)
  }

  async function submeter() {
    if (!descricaoPreenchida(descricao)) return
    await criar.mutateAsync({
      titulo,
      descricao,
      prioridade,
      categoriaId: categoriaId || undefined,
    })
    setTitulo('')
    setDescricao('')
    setCategoriaId('')
    setPrioridade('media')
    setAbrirForm(false)
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Chamados</h2>
          <p className="text-sm text-muted">Helpdesk institucional — abra e acompanhe solicitações de TI</p>
        </div>
        <Button onClick={() => setAbrirForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Novo chamado
        </Button>
      </div>

      {abrirForm && (
        <Card>
          <CardHeader>
            <CardTitle>Abrir chamado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <RichTextEditor
                value={descricao}
                onChange={setDescricao}
                placeholder="Descreva o problema com detalhes. Você pode formatar o texto e inserir imagens (máx. 20 MB)."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={prioridade} onValueChange={setPrioridade}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={categoriaId || 'none'} onValueChange={(v) => setCategoriaId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {categorias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={submeter}
                disabled={!titulo || !descricaoPreenchida(descricao) || criar.isPending}
              >
                {criar.isPending ? 'Enviando…' : 'Registrar'}
              </Button>
              <Button variant="secondary" onClick={() => setAbrirForm(false)}>
                Cancelar
              </Button>
            </div>
            {criar.isError && (
              <p className="text-sm text-danger">{(criar.error as Error).message}</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Select value={escopo} onValueChange={setEscopo}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="meus">Meus chamados</SelectItem>
            {(ehAtendente || ehAdmin) && (
              <SelectItem value="secao">Fila da seção</SelectItem>
            )}
            {ehAdmin && <SelectItem value="todos">Todos</SelectItem>}
          </SelectContent>
        </Select>
        <Input
          className="max-w-xs"
          placeholder="Buscar por título ou nº"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted">Carregando…</p>}
          {error && (
            <p className="p-6 text-sm text-danger">{(error as Error).message}</p>
          )}
          {!isLoading && !error && chamados.length === 0 && (
            <p className="p-6 text-sm text-muted">Nenhum chamado encontrado.</p>
          )}
          {chamados.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Nº</th>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Prioridade</th>
                  <th className="px-4 py-3 font-semibold">Seção</th>
                  <th className="px-4 py-3 font-semibold">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {chamados.map((c) => (
                  <tr key={c.id} className="border-b border-line/70 hover:bg-paper/80">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link className="text-ink underline" to={`/chamados/${c.id}`}>
                        #{c.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-medium hover:underline" to={`/chamados/${c.id}`}>
                        {c.titulo}
                      </Link>
                      {c.categoria && (
                        <p className="text-xs text-muted">{c.categoria.nome}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[c.status] ?? 'secondary'}>
                        {c.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{c.prioridade}</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.ouCodigo ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(c.atualizadoEm).toLocaleString('pt-BR')}
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
