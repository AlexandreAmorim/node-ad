import { useAndamentos, useProcesso } from '@/api/processos'
import { Badge } from '@/components/Badge'
import { Carregando, ErroApi, Vazio } from '@/components/Estado'
import { Section } from '@/components/Section'
import { adaptarProcesso, formatarDataHora, situacaoDe } from '@/lib/adaptar'

interface FichaCasoProps {
  processoId: string
}

export function FichaCaso({ processoId }: FichaCasoProps) {
  const processo = useProcesso(processoId)
  const andamentos = useAndamentos(processoId)

  if (processo.isPending) return <Carregando texto="Abrindo ficha do caso…" />
  if (processo.isError)
    return <ErroApi erro={processo.error} aoTentar={() => processo.refetch()} />

  const p = adaptarProcesso(processo.data)

  return (
    <article className="rounded-[10px] border border-line bg-card px-7 py-6">
      <div className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">
        Ficha do Caso — dados sincronizados do SEI
      </div>
      <h2 className="mt-1 mb-1.5 font-mono text-xl font-bold text-ink">{p.sei}</h2>

      <div className="mb-[18px] flex flex-wrap gap-2">
        <Badge tone="ink">{p.tipo}</Badge>
        {p.unidades.map((u) => (
          <Badge key={u} tone="inkSoft">
            {u}
          </Badge>
        ))}
        <Badge tone={p.concluido ? 'ok' : 'muted'}>{situacaoDe(p)}</Badge>
        {p.erro && <Badge tone="danger">falha na sincronização</Badge>}
      </div>

      {p.linkAcesso && (
        <a
          href={p.linkAcesso}
          target="_blank"
          rel="noreferrer"
          className="mb-5 inline-block rounded-md border border-line bg-paper px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft"
        >
          Abrir no SEI ↗
        </a>
      )}

      <Section titulo="Especificação">
        <p className="text-[13.5px] leading-[1.7] text-ink">
          {p.especificacao ?? 'Sem especificação registrada no SEI.'}
        </p>
        <p className="mt-2 text-[11.5px] text-muted">
          Última sincronização: {formatarDataHora(p.sincronizadoEm)}
          {p.falhasConsecutivas > 0 && ` · ${p.falhasConsecutivas} falha(s) consecutiva(s)`}
        </p>
      </Section>

      {p.erro && (
        <Section titulo="Falha de sincronização">
          <div className="rounded-md border border-danger/35 bg-danger/6 px-3 py-2.5 text-[13px] text-ink">
            <span className="font-mono text-xs text-danger">{p.erro.tipo ?? 'erro'}</span>
            <div className="mt-1">{p.erro.mensagem}</div>
          </div>
        </Section>
      )}

      <Section titulo="Partes e papéis">
        <Vazio texto="Interessados ainda não são persistidos pela API — o seiSync os solicita ao SEI mas não os grava." />
      </Section>

      <Section titulo="Linha do tempo (andamentos do SEI)">
        {andamentos.isPending && <Carregando texto="Carregando andamentos…" />}
        {andamentos.isError && <ErroApi erro={andamentos.error} />}
        {andamentos.isSuccess && andamentos.data.length === 0 && (
          <Vazio texto="Nenhum andamento capturado. Verifique SEI_TAREFAS_ANDAMENTO no backend." />
        )}
        {andamentos.isSuccess && andamentos.data.length > 0 && (
          <ol className="border-l-2 border-line pl-4">
            {andamentos.data.map((a) => (
              <li key={a.id} className="relative mb-3">
                <span className="absolute top-1 -left-[22px] h-2.5 w-2.5 rounded-full border-2 border-white bg-ink" />
                <div className="font-mono text-xs font-semibold text-ink-soft">
                  {formatarDataHora(new Date(a.ocorridoEm))}
                  {a.unidade && ` · ${a.unidade.sigla}`}
                </div>
                <div className="text-[13px] text-ink">{a.descricao}</div>
                {a.usuario && (
                  <div className="text-[11.5px] text-muted">{a.usuario.nome ?? a.usuario.sigla}</div>
                )}
              </li>
            ))}
          </ol>
        )}
      </Section>

      <p className="border-t border-line pt-3 text-[11.5px] leading-[1.6] text-muted italic">
        Documento de apoio gerado automaticamente: não substitui a leitura dos autos nem
        constitui juízo sobre os fatos. Processos sigilosos não são retornados pelo Web Service
        do SEI e, portanto, não aparecem aqui.
      </p>
    </article>
  )
}
