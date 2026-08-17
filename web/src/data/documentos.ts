import type { DocumentoSei } from '@/types'

export const DOCUMENTOS: Record<string, DocumentoSei> = {
  '55443322': {
    rotulo: 'Relatório de Diárias',
    tipoDoc: 'Relatório',
    dataDoc: '12/01/2026',
    citadoEm: ['SEI-220001/004821/2026', 'SEI-220001/005104/2026'],
    resumo:
      'Relatório consolidando as diárias concedidas na SUBGAB no exercício de 2025. Atestado em 12/01/2026 por servidor citado na sindicância. É a peça central comum aos dois procedimentos: no PAD figura como prova documental; na sindicância, como objeto do atesto sob apuração.',
  },
  '55448899': {
    rotulo: 'Planilha de prestação de contas',
    tipoDoc: 'Planilha',
    dataDoc: 'não extraída',
    citadoEm: ['SEI-220001/004821/2026'],
    resumo:
      'Planilha de prestação de contas das diárias, integrante dos autos do PAD como documento de instrução.',
  },
  '61220044': {
    rotulo: 'Termo de Recebimento',
    tipoDoc: 'Termo',
    dataDoc: 'não extraída',
    citadoEm: ['SEI-220001/003310/2026'],
    resumo:
      'Termo de recebimento de materiais que instrui a sindicância sobre aquisições na SUPLOG.',
  },
  '61220077': {
    rotulo: 'Inventário do Almoxarifado',
    tipoDoc: 'Inventário',
    dataDoc: '19/06/2026',
    citadoEm: ['SEI-220001/003310/2026', 'SEI-220001/004455/2026'],
    resumo:
      'Inventário do almoxarifado da SUPLOG. Instrui a sindicância em curso e foi anexado, dias depois, à denúncia que originou a investigação preliminar — elo material direto entre os dois procedimentos.',
  },
}
