import type { Procedimento } from '@/types'

/**
 * Data de referência do protótipo. Todos os cálculos de prazo e prescrição
 * partem daqui — trocar por `new Date()` ao ligar em dados reais.
 */
export const DATA_REFERENCIA = new Date(2026, 6, 17)

export const PROCEDIMENTOS: Procedimento[] = [
  {
    sei: 'SEI-220001/004821/2026',
    tipo: 'PAD',
    fase: 'Instrução',
    unidade: 'SUBGAB',
    prazoFim: '2026-07-24',
    envolvido: 'SRV-9376',
    situacao: 'Em andamento',
    prescricao: '2027-11-02',
  },
  {
    sei: 'SEI-220001/003310/2026',
    tipo: 'Sindicância',
    fase: 'Oitivas',
    unidade: 'SUPLOG',
    prazoFim: '2026-08-02',
    envolvido: 'SRV-4579',
    situacao: 'Em andamento',
    prescricao: '2028-03-15',
  },
  {
    sei: 'SEI-220001/001945/2025',
    tipo: 'PAD',
    fase: 'Defesa',
    unidade: 'SUBGAB',
    prazoFim: '2026-07-19',
    envolvido: 'SRV-4386',
    situacao: 'Prorrogado',
    prescricao: '2026-10-08',
  },
  {
    sei: 'SEI-220001/000772/2025',
    tipo: 'Investigação Preliminar',
    fase: 'Análise',
    unidade: 'COORTI',
    prazoFim: '2026-09-14',
    envolvido: 'SRV-0233',
    situacao: 'Em andamento',
    prescricao: '2028-06-20',
  },
  {
    sei: 'SEI-220001/005104/2026',
    tipo: 'Sindicância',
    fase: 'Relatório',
    unidade: 'SUBGAB',
    prazoFim: '2026-07-16',
    envolvido: 'SRV-9376',
    situacao: 'Em andamento',
    prescricao: '2027-12-10',
  },
  {
    sei: 'SEI-220001/002218/2025',
    tipo: 'PAD',
    fase: 'Julgamento',
    unidade: 'SUPRH',
    prazoFim: '2026-08-30',
    envolvido: 'SRV-0371',
    situacao: 'Aguardando julgamento',
    prescricao: '2026-09-22',
  },
  {
    sei: 'SEI-220001/004455/2026',
    tipo: 'Investigação Preliminar',
    fase: 'Triagem',
    unidade: 'SUPLOG',
    prazoFim: '2026-10-05',
    envolvido: 'SRV-4579',
    situacao: 'Em andamento',
    prescricao: '2029-01-30',
  },
  {
    sei: 'SEI-220001/001120/2026',
    tipo: 'Sindicância',
    fase: 'Oitivas',
    unidade: 'COORTI',
    prazoFim: '2026-07-28',
    envolvido: 'SRV-0664',
    situacao: 'Suspenso',
    prescricao: '2028-02-14',
  },
  {
    sei: 'SEI-220001/003987/2026',
    tipo: 'PAD',
    fase: 'Instrução',
    unidade: 'SUPRH',
    prazoFim: '2026-09-25',
    envolvido: 'SRV-0290',
    situacao: 'Em andamento',
    prescricao: '2028-08-05',
  },
  {
    sei: 'SEI-220001/000415/2025',
    tipo: 'Sindicância',
    fase: 'Relatório',
    unidade: 'SUBGAB',
    prazoFim: '2026-07-12',
    envolvido: 'SRV-4386',
    situacao: 'Em andamento',
    prescricao: '2027-04-18',
  },
]

export const NOVAS_DEMANDAS_POR_MES = [
  { mes: 'Fev', casos: 6 },
  { mes: 'Mar', casos: 9 },
  { mes: 'Abr', casos: 5 },
  { mes: 'Mai', casos: 11 },
  { mes: 'Jun', casos: 8 },
  { mes: 'Jul', casos: 4 },
]
