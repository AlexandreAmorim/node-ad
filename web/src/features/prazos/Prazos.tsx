import { useMemo, useState } from 'react'

import { useProcessos, useSincronizar } from '@/api/processos'
import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { Carregando, ErroApi, Vazio } from '@/components/Estado'
import { adaptarProcesso, formatarDataHora, situacaoDe } from '@/lib/adaptar'
import { severidadePrazo, severidadePrescricao, textoPrazo, formatarData } from '@/lib/prazos'
import { FUNDO_SEVERIDADE, TEXTO_SEVERIDADE } from '@/lib/severidade'

type Filtro = 'ativos' | 'criticos' | 'concluidos' | 'comErro'

const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'ativos', rotulo: 'Em andamento' },
  { id: 'criticos', rotulo: 'Prazo ≤ 15d' },
  { id: 'comErro', rotulo: 'Com falha' },
  { id: 'concluidos', rotulo: 'Concluídos' },
]

const TH =
  'px-3.5 py-2.5 text-left text-[11px] font-bold tracking-[0.07em] text-ink-soft uppercase whitespace-nowrap border-b-2 border-line'
const TD = 'px-3.5 py-3 align-middle text-[13px] text-ink border-b border-line'

interface PrazosProps {
  abrirFicha: (id: string) => void
}

export function Prazos({ abrirFicha }: PrazosProps) {
  const [filtro, setFiltro] = useState<Filtro>('ativos')

  const query = useProcessos(
    filtro === 'concluidos' ? { concluido: true, limite: 200 } : { ativo: true, limite: 200 },
  )
  const sincronizar = useSincronizar()

  const linhas = useMemo(() => {
    const base = (query.data ?? []).map(adaptarProcesso)
    if (filtro === 'criticos') return base.filter((p) => p.dias !== null && p.dias <= 15)
    if (filtro === 'comErro') return base.filter((p) => p.erro !== null)
    if (filtro === 'ativos') return base.filter((p) => !p.concluido)
    return base
  }, [query.data, filtro])

  return (
    <Card
      title="Controle de prazos"
      bodyPadding="none"
      right={
        <div className="flex flex-wrap gap-1.5">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFiltro(f.id)}
              className={`cursor-pointer rounded border px-3 py-[5px] text-xs font-semibold transition-colors ${
                filtro === f.id
                  ? 'border-ink bg-ink text-white'
                  : 'border-line bg-white text-ink-soft hover:border-ink-soft'
              }`}
            >
              {f.rotulo}
            </button>
          ))}
        </div>
      }
    >
      {query.isPending && <Carregando texto="Consultando processos monitorados…" />}
      {query.isError && <ErroApi erro={query.error} aoTentar={() => query.refetch()} />}

      {query.isSuccess && linhas.length === 0 && (
        <Vazio
          texto={
            filtro === 'comErro'
              ? 'Nenhum processo com falha de sincronização.'
              : 'Nenhum processo neste filtro. Cadastre um protocolo para começar o monitoramento.'
          }
        />
      )}

      {query.isSuccess && linhas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>Processo SEI</th>
                <th className={TH}>Tipo</th>
                <th className={TH}>Unidade</th>
                <th className={TH}>Último andamento</th>
                <th className={TH}>Situação do prazo</th>
                <th className={TH}>Prescrição</th>
                <th className={TH}>Sincronizado</th>
                <th className={TH}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((p) => {
                const sevPrazo = p.dias === null ? null : severidadePrazo(p.dias)
                const sevPresc = p.diasPresc === null ? null : severidadePrescricao(p.diasPresc)
                const sincronizando =
                  sincronizar.isPending && sincronizar.variables === p.id

                return (
                  <tr key={p.id} className={p.erro ? 'bg-danger/4' : undefined}>
                    <td className={TD}>
                      <button
                        type="button"
                        onClick={() => abrirFicha(p.id)}
                        className="cursor-pointer font-mono text-xs font-medium text-ink-soft underline decoration-ink-soft"
                      >
                        {p.sei}
                      </button>
                      {p.erro && (
                        <div className="mt-1 max-w-xs text-[11px] text-danger">
                          ⚠ {p.erro.mensagem}
                        </div>
                      )}
                    </td>
                    <td className={TD}>{p.tipo}</td>
                    <td className={TD}>
                      <span className="font-mono text-xs">
                        {p.unidades.join(', ') || situacaoDe(p)}
                      </span>
                    </td>
                    <td className={`${TD} max-w-[260px]`}>
                      <div className="truncate" title={p.ultimoAndamentoTexto ?? ''}>
                        {p.ultimoAndamentoTexto ?? '—'}
                      </div>
                      <div className="text-[11px] text-muted">
                        {formatarDataHora(p.ultimoAndamentoEm)}
                      </div>
                    </td>
                    <td className={TD}>
                      {sevPrazo && p.dias !== null ? (
                        <span className="inline-flex items-center gap-[7px]">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${FUNDO_SEVERIDADE[sevPrazo]}`}
                          />
                          <span
                            className={`text-[12.5px] font-semibold ${TEXTO_SEVERIDADE[sevPrazo]}`}
                          >
                            {textoPrazo(p.dias)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[12px] text-muted" title="Campo ainda não persistido pela API">
                          sem controle
                        </span>
                      )}
                    </td>
                    <td className={TD}>
                      {sevPresc && p.prescricao ? (
                        <Badge tone={sevPresc}>{formatarData(p.prescricao)}</Badge>
                      ) : (
                        <span className="text-[12px] text-muted">—</span>
                      )}
                    </td>
                    <td className={`${TD} text-[12px] text-muted`}>
                      {formatarDataHora(p.sincronizadoEm)}
                    </td>
                    <td className={TD}>
                      <button
                        type="button"
                        disabled={sincronizando}
                        onClick={() => sincronizar.mutate(p.id)}
                        className="cursor-pointer rounded bg-ink px-2.5 py-[5px] text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {sincronizando ? 'Sincronizando…' : 'Sincronizar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-4 py-3 text-xs text-muted">
        Prazo e prescrição aparecem como “sem controle” porque ainda não existem no schema da
        API. Os demais campos vêm da sincronização com o SEI.
      </p>
    </Card>
  )
}
