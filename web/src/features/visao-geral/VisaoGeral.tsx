import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useProcessos } from '@/api/processos'
import { Card } from '@/components/Card'
import { Carregando, ErroApi, Vazio } from '@/components/Estado'
import { Kpi } from '@/components/Kpi'
import { adaptarProcesso, type ProcessoPainel } from '@/lib/adaptar'
import { CORES } from '@/lib/tokens'

const EIXO = { fontSize: 11, fill: CORES.muted }
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function agregar(processos: ProcessoPainel[]) {
  const porTipo = new Map<string, number>()
  const porUnidade = new Map<string, number>()

  for (const p of processos) {
    porTipo.set(p.tipo, (porTipo.get(p.tipo) ?? 0) + 1)
    // Um processo aberto em N unidades conta em cada uma — é o que o
    // corregedor quer ver: carga por unidade, não partição do total.
    for (const u of p.unidades) porUnidade.set(u, (porUnidade.get(u) ?? 0) + 1)
  }

  return {
    porTipo: [...porTipo].map(([tipo, qtd]) => ({ tipo, qtd })).sort((a, b) => b.qtd - a.qtd),
    porUnidade: [...porUnidade]
      .map(([unidade, qtd]) => ({ unidade, qtd }))
      .sort((a, b) => b.qtd - a.qtd),
  }
}

/** Série dos últimos 6 meses a partir da data de autuação. */
function demandasPorMes(processos: { dataAutuacao: string | null }[]) {
  const agora = new Date()
  const baldes: { chave: string; mes: string; casos: number }[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1)
    baldes.push({
      chave: `${d.getFullYear()}-${d.getMonth()}`,
      mes: MESES[d.getMonth()],
      casos: 0,
    })
  }

  for (const p of processos) {
    if (!p.dataAutuacao) continue
    const d = new Date(p.dataAutuacao)
    const balde = baldes.find((b) => b.chave === `${d.getFullYear()}-${d.getMonth()}`)
    if (balde) balde.casos += 1
  }

  return baldes
}

export function VisaoGeral() {
  const query = useProcessos({ ativo: true, limite: 500 })

  const dados = useMemo(() => {
    const processos = (query.data ?? []).map(adaptarProcesso)
    return {
      processos,
      emAndamento: processos.filter((p) => !p.concluido).length,
      comFalha: processos.filter((p) => p.erro !== null).length,
      concluidos: processos.filter((p) => p.concluido).length,
      comPrazo: processos.filter((p) => p.dias !== null).length,
      ...agregar(processos),
      serie: demandasPorMes(query.data ?? []),
    }
  }, [query.data])

  if (query.isPending) return <Carregando texto="Carregando painel…" />
  if (query.isError) return <ErroApi erro={query.error} aoTentar={() => query.refetch()} />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Kpi
          label="Processos monitorados"
          value={dados.processos.length}
          sub="sincronizados com o SEI"
        />
        <Kpi label="Em andamento" value={dados.emAndamento} sub="abertos em alguma unidade" />
        <Kpi
          label="Falhas de sincronização"
          value={dados.comFalha}
          sub="exigem verificação"
          tone={dados.comFalha ? 'danger' : 'ok'}
        />
        <Kpi label="Concluídos" value={dados.concluidos} sub="sem unidade aberta" tone="ok" />
      </div>

      <Card title="Radar de prescrição">
        {dados.comPrazo === 0 ? (
          <Vazio texto="Controle de prazo e prescrição ainda não é persistido pela API — o radar acende quando os campos existirem no schema." />
        ) : (
          <Vazio texto={`${dados.comPrazo} processo(s) com prazo definido.`} />
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Processos por tipo" bodyPadding="sm">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dados.porTipo} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CORES.line} vertical={false} />
              <XAxis dataKey="tipo" tick={EIXO} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={EIXO} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(19,43,69,0.05)' }} />
              <Bar dataKey="qtd" name="Processos" fill={CORES.ink} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Autuações por mês" bodyPadding="sm">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dados.serie} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CORES.line} vertical={false} />
              <XAxis dataKey="mes" tick={EIXO} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={EIXO} axisLine={false} tickLine={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="casos"
                name="Autuações"
                stroke={CORES.ink}
                strokeWidth={2.5}
                dot={{ r: 4, fill: CORES.ink }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Concentração por unidade" bodyPadding="md">
        {dados.porUnidade.length === 0 ? (
          <Vazio texto="Nenhuma unidade aberta nos processos monitorados." />
        ) : (
          <div className="flex flex-col gap-2.5">
            {dados.porUnidade.map((u) => (
              <div key={u.unidade} className="flex items-center gap-3">
                <span className="w-[78px] font-mono text-xs font-semibold text-ink">
                  {u.unidade}
                </span>
                <div className="h-4 flex-1 overflow-hidden rounded-[3px] bg-paper">
                  <div
                    className="h-full rounded-[3px] bg-ink-soft"
                    style={{ width: `${(u.qtd / dados.porUnidade[0].qtd) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-[12.5px] text-muted">
                  {u.qtd} caso{u.qtd > 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
