import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Server } from 'lucide-react'

import { useAuth } from '@/api/auth'
import {
  useAtivos,
  useAtivosResumo,
  useCriarAtivo,
  useFabricantes,
  useLocalizacoes,
  useModelosAtivo,
} from '@/api/ativos'
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

const TIPOS = [
  'computador',
  'monitor',
  'impressora',
  'rede',
  'telefone',
  'periferico',
  'software',
  'outro',
]

const STATUS = ['em_estoque', 'em_uso', 'em_manutencao', 'reservado', 'descartado']

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'ok' | 'warn' | 'danger'> = {
  em_estoque: 'secondary',
  em_uso: 'ok',
  em_manutencao: 'warn',
  reservado: 'default',
  descartado: 'danger',
}

export function AtivosPage() {
  const { ehAdmin, usuario } = useAuth()
  const [tipo, setTipo] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [abrirForm, setAbrirForm] = useState(false)

  const { data: resumo } = useAtivosResumo()
  const { data: ativos = [], isLoading, error } = useAtivos({
    tipo: tipo || undefined,
    status: status || undefined,
    busca: busca || undefined,
  })
  const { data: fabricantes = [] } = useFabricantes()
  const { data: localizacoes = [] } = useLocalizacoes()
  const { data: modelos = [] } = useModelosAtivo(tipo || undefined)
  const criar = useCriarAtivo()

  const [nome, setNome] = useState('')
  const [formTipo, setFormTipo] = useState('computador')
  const [formStatus, setFormStatus] = useState('em_estoque')
  const [numeroSerie, setNumeroSerie] = useState('')
  const [numeroPatrimonio, setNumeroPatrimonio] = useState('')
  const [fabricanteId, setFabricanteId] = useState('')
  const [modeloId, setModeloId] = useState('')
  const [localizacaoId, setLocalizacaoId] = useState('')
  const [usuarioUsername, setUsuarioUsername] = useState('')

  // Inventário geral: só admin cadastra/edita. Usuário comum só vê os seus.
  const podeGerir = ehAdmin

  async function submeter() {
    await criar.mutateAsync({
      nome,
      tipo: formTipo,
      status: formStatus,
      numeroSerie: numeroSerie || null,
      numeroPatrimonio: numeroPatrimonio || null,
      fabricanteId: fabricanteId || null,
      modeloId: modeloId || null,
      localizacaoId: localizacaoId || null,
      usuarioUsername: usuarioUsername || null,
      ouCodigo: usuario?.secao ?? null,
    })
    setNome('')
    setNumeroSerie('')
    setNumeroPatrimonio('')
    setUsuarioUsername('')
    setAbrirForm(false)
  }

  return (
    <div className="mx-auto max-w-shell space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-extrabold">Ativos / CMDB</h2>
          <p className="text-sm text-muted">
            {ehAdmin
              ? 'Inventário completo — visão administrador'
              : 'Seus equipamentos atribuídos'}
          </p>
        </div>
        {podeGerir && (
          <Button onClick={() => setAbrirForm((v) => !v)}>
            <Plus className="h-4 w-4" />
            Novo ativo
          </Button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Server className="h-8 w-8 text-ink-soft" />
            <div>
              <p className="text-xs text-muted">Total</p>
              <p className="font-display text-2xl font-bold">{resumo?.total ?? '—'}</p>
            </div>
          </CardContent>
        </Card>
        {['em_uso', 'em_estoque', 'em_manutencao'].map((s) => (
          <Card key={s}>
            <CardContent className="py-4">
              <p className="text-xs capitalize text-muted">{s.replace(/_/g, ' ')}</p>
              <p className="font-display text-2xl font-bold">
                {resumo?.porStatus?.[s] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {abrirForm && podeGerir && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar ativo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Nome *</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº série</Label>
                <Input className="font-mono" value={numeroSerie} onChange={(e) => setNumeroSerie(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Patrimônio</Label>
                <Input className="font-mono" value={numeroPatrimonio} onChange={(e) => setNumeroPatrimonio(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fabricante</Label>
                <Select value={fabricanteId || 'none'} onValueChange={(v) => setFabricanteId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {fabricantes.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Select value={modeloId || 'none'} onValueChange={(v) => setModeloId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Localização</Label>
                <Select value={localizacaoId || 'none'} onValueChange={(v) => setLocalizacaoId(v === 'none' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">—</SelectItem>
                    {localizacoes.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Usuário AD (username)</Label>
                <Input
                  className="font-mono"
                  value={usuarioUsername}
                  onChange={(e) => setUsuarioUsername(e.target.value)}
                  placeholder="usuario.rede"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={submeter} disabled={!nome || criar.isPending}>
                {criar.isPending ? 'Salvando…' : 'Cadastrar'}
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
        <Select value={tipo || 'all'} onValueChange={(v) => setTipo(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TIPOS.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          className="max-w-xs"
          placeholder="Buscar nome, série, patrimônio…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <p className="p-6 text-sm text-muted">Carregando…</p>}
          {error && <p className="p-6 text-sm text-danger">{(error as Error).message}</p>}
          {!isLoading && ativos.length === 0 && (
            <p className="p-6 text-sm text-muted">Nenhum ativo encontrado.</p>
          )}
          {ativos.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Nº</th>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Patrimônio</th>
                </tr>
              </thead>
              <tbody>
                {ativos.map((a) => (
                  <tr key={a.id} className="border-b border-line/70 hover:bg-paper/80">
                    <td className="px-4 py-3 font-mono text-xs">
                      <Link className="underline" to={`/ativos/${a.id}`}>
                        #{a.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link className="font-medium hover:underline" to={`/ativos/${a.id}`}>
                        {a.nome}
                      </Link>
                      {a.modelo && (
                        <p className="text-xs text-muted">
                          {a.fabricante?.nome} {a.modelo.nome}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{a.tipo}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[a.status] ?? 'secondary'}>
                        {a.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {a.usuarioNome ?? a.usuarioUsername ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs">{a.localizacao?.nome ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.numeroPatrimonio ?? '—'}</td>
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
