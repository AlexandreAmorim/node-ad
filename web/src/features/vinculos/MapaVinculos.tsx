import { ARESTAS, NOS, NOS_POR_ID } from '@/data/grafo'
import { CORES } from '@/lib/tokens'
import type { NoGrafo } from '@/types'

const RAIOS: Record<NoGrafo['tipo'], number> = {
  servidor: 17,
  processo: 13,
  unidade: 15,
}

const COR_POR_TIPO: Record<NoGrafo['tipo'], string> = {
  servidor: CORES.nexus,
  processo: CORES.ink,
  unidade: CORES.inkSoft,
}

interface MapaVinculosProps {
  selecionado: string
  onSelecionar: (id: string) => void
}

export function MapaVinculos({ selecionado, onSelecionar }: MapaVinculosProps) {
  const arestasDoNo = ARESTAS.filter((e) => e.a === selecionado || e.b === selecionado)
  const vizinhos = new Set(arestasDoNo.flatMap((e) => [e.a, e.b]))

  return (
    <svg viewBox="0 0 820 400" className="h-auto w-full" role="img" aria-label="Mapa de vínculos entre servidores, processos e unidades">
      {ARESTAS.map((aresta, i) => {
        const de = NOS_POR_ID[aresta.a]
        const para = NOS_POR_ID[aresta.b]
        const destacada = aresta.a === selecionado || aresta.b === selecionado
        const coLotacao = aresta.rel.startsWith('co-lotação')

        return (
          <g key={`${aresta.a}-${aresta.b}-${i}`}>
            <line
              x1={de.x}
              y1={de.y}
              x2={para.x}
              y2={para.y}
              stroke={destacada ? (coLotacao ? CORES.nexus : CORES.inkSoft) : '#D3DBE2'}
              strokeWidth={destacada ? 2.2 : 1.2}
              strokeDasharray={coLotacao ? '5 4' : '0'}
            />
            {destacada && (
              <text
                x={(de.x + para.x) / 2}
                y={(de.y + para.y) / 2 - 6}
                textAnchor="middle"
                className="font-body text-[10.5px] font-semibold"
                fill={coLotacao ? CORES.nexus : CORES.inkSoft}
              >
                {aresta.rel}
              </text>
            )}
          </g>
        )
      })}

      {NOS.map((no) => {
        const ativo = no.id === selecionado || vizinhos.has(no.id)
        const fill = ativo ? COR_POR_TIPO[no.tipo] : CORES.neutro
        const r = RAIOS[no.tipo]

        return (
          <g
            key={no.id}
            role="button"
            tabIndex={0}
            aria-label={no.label ?? no.id}
            className="cursor-pointer"
            onClick={() => onSelecionar(no.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelecionar(no.id)
              }
            }}
          >
            {no.tipo === 'processo' && (
              <rect
                x={no.x - r}
                y={no.y - r}
                width={r * 2}
                height={r * 2}
                rx={3}
                fill={fill}
                stroke="#fff"
                strokeWidth={2.5}
              />
            )}
            {no.tipo === 'unidade' && (
              <rect
                x={no.x - r}
                y={no.y - r * 0.72}
                width={r * 2}
                height={r * 1.44}
                rx={r}
                fill={fill}
                stroke="#fff"
                strokeWidth={2.5}
              />
            )}
            {no.tipo === 'servidor' && (
              <circle cx={no.x} cy={no.y} r={r} fill={fill} stroke="#fff" strokeWidth={2.5} />
            )}
            <text
              x={no.x}
              y={no.y + r + 14}
              textAnchor="middle"
              className="font-mono text-[11px] font-semibold"
              fill={no.id === selecionado ? CORES.ink : CORES.muted}
            >
              {no.label ?? no.id}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
