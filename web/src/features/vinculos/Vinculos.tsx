import { useState } from 'react'

import { Badge } from '@/components/Badge'
import { Card } from '@/components/Card'
import { AvisoDemonstracao } from '@/components/Estado'
import { ARESTAS, NOS_POR_ID } from '@/data/grafo'
import { MapaVinculos } from './MapaVinculos'

export function Vinculos() {
  const [selecionado, setSelecionado] = useState('SRV-9376')

  const arestasDoNo = ARESTAS.filter((e) => e.a === selecionado || e.b === selecionado)
  const no = NOS_POR_ID[selecionado]

  return (
    <>
      <AvisoDemonstracao texto="O mapa de vínculos ainda usa os dados fictícios do protótipo. A API não persiste interessados nem processos relacionados — ver ProcedimentosRelacionados no seiSync." />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card
        title="Mapa de vínculos"
        bodyPadding="sm"
        right={<Badge tone="nexus">extração automática — pipeline v0.2</Badge>}
      >
        <MapaVinculos selecionado={selecionado} onSelecionar={setSelecionado} />
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="Entidade selecionada" bodyPadding="md">
          <div className="font-mono text-[15px] font-semibold text-ink">
            {no?.label ?? selecionado}
          </div>
          <div className="mt-0.5 text-xs text-muted capitalize">{no?.tipo}</div>


          <hr className="my-3 border-line" />

          <div className="mb-2 text-xs font-bold tracking-[0.06em] text-ink-soft uppercase">
            Vínculos ({arestasDoNo.length})
          </div>

          <div className="flex flex-col gap-2">
            {arestasDoNo.map((aresta, i) => {
              const outro = aresta.a === selecionado ? aresta.b : aresta.a
              return (
                <button
                  key={`${outro}-${i}`}
                  type="button"
                  onClick={() => setSelecionado(outro)}
                  className="cursor-pointer rounded-md border border-line bg-paper px-2.5 py-2 text-left text-[12.5px] text-ink transition-colors hover:border-ink-soft"
                >
                  <span className="font-mono font-semibold">
                    {NOS_POR_ID[outro]?.label ?? outro}
                  </span>
                  <span className="text-muted"> — {aresta.rel}</span>
                </button>
              )
            })}
          </div>
        </Card>

        <Card title="Como ler este mapa" bodyPadding="md">
          <p className="text-[12.5px] leading-[1.65] text-muted">
            Vínculos são <b className="text-ink">hipóteses investigativas</b> computadas do
            acervo, dos metadados do SEI e de fontes públicas — nunca conclusões. Servidores
            aparecem apenas por código pseudonimizado.
          </p>
        </Card>
        </div>
      </div>
    </>
  )
}
