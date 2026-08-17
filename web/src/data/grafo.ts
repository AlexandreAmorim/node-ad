import type { ArestaGrafo, NoGrafo } from '@/types'

export const NOS: NoGrafo[] = [
  { id: 'SRV-9376', tipo: 'servidor', x: 300, y: 150 },
  { id: 'SRV-4579', tipo: 'servidor', x: 620, y: 130 },
  { id: 'SRV-4386', tipo: 'servidor', x: 180, y: 330 },
  { id: 'SRV-4307', tipo: 'servidor', x: 700, y: 330 },
  { id: 'SEI-220001/004821/2026', tipo: 'processo', x: 300, y: 40, label: 'PAD ...4821/26' },
  { id: 'SEI-220001/005104/2026', tipo: 'processo', x: 130, y: 140, label: 'SIND ...5104/26' },
  { id: 'SEI-220001/001945/2025', tipo: 'processo', x: 60, y: 250, label: 'PAD ...1945/25' },
  { id: 'SEI-220001/003310/2026', tipo: 'processo', x: 620, y: 30, label: 'SIND ...3310/26' },
  { id: 'SEI-220001/004455/2026', tipo: 'processo', x: 760, y: 200, label: 'IP ...4455/26' },
  { id: 'U-SUPLOG', tipo: 'unidade', x: 470, y: 250, label: 'SUPLOG' },
  { id: 'U-SUBGAB', tipo: 'unidade', x: 240, y: 240, label: 'SUBGAB' },
]

export const ARESTAS: ArestaGrafo[] = [
  { a: 'SRV-9376', b: 'SEI-220001/004821/2026', rel: 'investigado em' },
  { a: 'SRV-9376', b: 'SEI-220001/005104/2026', rel: 'investigado em' },
  { a: 'SRV-4386', b: 'SEI-220001/001945/2025', rel: 'investigado em' },
  { a: 'SRV-4386', b: 'SEI-220001/005104/2026', rel: 'citado em' },
  { a: 'SRV-4579', b: 'SEI-220001/003310/2026', rel: 'investigado em' },
  { a: 'SRV-4579', b: 'SEI-220001/004455/2026', rel: 'investigado em' },
  { a: 'SRV-4579', b: 'SEI-220001/001945/2025', rel: 'testemunha em' },
  { a: 'SRV-4307', b: 'SEI-220001/004455/2026', rel: 'citado em' },
  { a: 'SRV-4307', b: 'SEI-220001/003310/2026', rel: 'testemunha em' },
  { a: 'SRV-9376', b: 'U-SUBGAB', rel: 'lotado em' },
  { a: 'SRV-4386', b: 'U-SUBGAB', rel: 'lotado em' },
  { a: 'SRV-4579', b: 'U-SUPLOG', rel: 'lotado em' },
  { a: 'SRV-4307', b: 'U-SUPLOG', rel: 'lotado em' },
  { a: 'SRV-9376', b: 'SRV-4386', rel: 'co-lotação 2019–2023' },
  { a: 'SRV-4579', b: 'SRV-4307', rel: 'co-lotação 2021–2026' },
]

export const NOS_POR_ID: Record<string, NoGrafo> = Object.fromEntries(
  NOS.map((no) => [no.id, no]),
)
