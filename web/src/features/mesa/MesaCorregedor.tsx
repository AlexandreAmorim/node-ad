import { useProcessos } from '@/api/processos'
import { Badge } from '@/components/Badge'
import { Carregando, ErroApi, Vazio } from '@/components/Estado'
import { adaptarProcesso } from '@/lib/adaptar'
import { abreviarSei } from '@/lib/prazos'
import { FichaCaso } from './FichaCaso'

interface MesaCorregedorProps {
  casoSel: string | null
  setCasoSel: (id: string) => void
}

export function MesaCorregedor({ casoSel, setCasoSel }: MesaCorregedorProps) {
  const query = useProcessos({ ativo: true, limite: 200 })
  const fila = (query.data ?? []).map(adaptarProcesso)
  const selecionado = casoSel ?? fila[0]?.id ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <div>
        <h2 className="mt-1.5 mb-2.5 font-display text-xs font-bold tracking-[0.09em] text-ink-soft uppercase">
          Fila de procedimentos ({fila.length})
        </h2>

        {query.isPending && <Carregando texto="Carregando fila…" />}
        {query.isError && <ErroApi erro={query.error} aoTentar={() => query.refetch()} />}
        {query.isSuccess && fila.length === 0 && (
          <Vazio texto="Nenhum processo monitorado ainda." />
        )}

        <div className="flex flex-col gap-2">
          {fila.map((p) => {
            const ativo = p.id === selecionado
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setCasoSel(p.id)}
                className={`cursor-pointer rounded-lg border px-3.5 py-3 text-left transition-colors ${
                  ativo ? 'border-ink bg-ink' : 'border-line bg-card hover:border-ink-soft'
                }`}
              >
                <div
                  className={`font-mono text-xs font-semibold ${ativo ? 'text-white' : 'text-ink'}`}
                >
                  {abreviarSei(p.sei)}
                </div>
                <div className={`mt-[3px] mb-1.5 text-xs ${ativo ? 'text-on-ink' : 'text-muted'}`}>
                  {p.tipo} · {p.unidades.join(', ') || '—'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.erro && (
                    <Badge tone={ativo ? 'onInkWarn' : 'danger'}>⚠ falha</Badge>
                  )}
                  {p.concluido && <Badge tone={ativo ? 'onInkNexus' : 'ok'}>concluído</Badge>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selecionado ? (
        <FichaCaso processoId={selecionado} />
      ) : (
        <Vazio texto="Selecione um processo na fila." />
      )}
    </div>
  )
}
