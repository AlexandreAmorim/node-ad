export type TipoProcedimento = 'PAD' | 'Sindicância' | 'Investigação Preliminar'

export type FaseProcedimento =
  | 'Triagem'
  | 'Análise'
  | 'Instrução'
  | 'Oitivas'
  | 'Defesa'
  | 'Relatório'
  | 'Julgamento'

export type SituacaoProcedimento =
  | 'Em andamento'
  | 'Prorrogado'
  | 'Suspenso'
  | 'Aguardando julgamento'

export interface Procedimento {
  /** Número do processo no SEI — chave natural do domínio. */
  sei: string
  tipo: TipoProcedimento
  fase: FaseProcedimento
  unidade: string
  /** ISO (yyyy-mm-dd) */
  prazoFim: string
  /** Código pseudonimizado do servidor envolvido */
  envolvido: string
  situacao: SituacaoProcedimento
  /** ISO (yyyy-mm-dd) */
  prescricao: string
}

/** Procedimento acrescido dos dias calculados em relação à data de referência. */
export interface ProcedimentoComPrazos extends Procedimento {
  dias: number
  diasPresc: number
}

export interface DocumentoSei {
  rotulo: string
  tipoDoc: string
  /** Pode não ter sido extraída dos autos. */
  dataDoc: string
  /** Processos SEI que citam este documento. */
  citadoEm: string[]
  resumo: string
}

export type PapelParte =
  | 'Investigado'
  | 'Citado'
  | 'Testemunha'
  | 'Membro de comissão'

export interface ParteFicha {
  cod: string
  papel: PapelParte
  /** Outros processos em que a mesma parte aparece. */
  outros: string[]
}

export interface EventoTimeline {
  data: string
  fato: string
}

export interface FichaCaso {
  origem: string
  resumo: string
  partes: ParteFicha[]
  conexos: string[]
  /** Chaves de DocumentoSei */
  docs: string[]
  /** Base legal citada nos autos */
  leg: string[]
  timeline: EventoTimeline[]
  alertas: string[]
}

export type TipoNo = 'servidor' | 'processo' | 'unidade'

export interface NoGrafo {
  id: string
  tipo: TipoNo
  x: number
  y: number
  label?: string
}

export interface ArestaGrafo {
  a: string
  b: string
  rel: string
}

export type AbaPainel = 'visao' | 'prazos' | 'vinculos' | 'mesa'
