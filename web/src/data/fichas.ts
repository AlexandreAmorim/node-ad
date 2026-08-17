import type { FichaCaso } from '@/types'

export const FICHAS: Record<string, FichaCaso> = {
  'SEI-220001/004455/2026': {
    origem: 'Denúncia — Ouvidoria',
    resumo:
      'Investigação preliminar instaurada em 21/06/2026 a partir de denúncia da Ouvidoria sobre suposto desvio de materiais na SUPLOG. A investigada já responde a sindicância sobre aquisições na mesma unidade, e o inventário anexado à denúncia é o mesmo documento que instrui aquela sindicância.',
    partes: [
      {
        cod: 'SRV-4579',
        papel: 'Investigado',
        outros: ['SEI-220001/001945/2025', 'SEI-220001/003310/2026'],
      },
      { cod: 'SRV-4307', papel: 'Citado', outros: ['SEI-220001/003310/2026'] },
    ],
    conexos: ['SEI-220001/003310/2026'],
    docs: ['61220077'],
    leg: [],
    timeline: [
      {
        data: '19/06/2026',
        fato: 'Inventário do Almoxarifado (doc. SEI 61220077) anexado à denúncia',
      },
      {
        data: '21/06/2026',
        fato: 'Denúncia recebida pela Ouvidoria; despacho de instauração da IP',
      },
    ],
    alertas: [
      'SRV-4579 aparece em 3 procedimentos (papéis: Investigado, Testemunha)',
      'Documento SEI nº 61220077 também é citado na Sindicância ...003310 — possível elo material',
    ],
  },
  'SEI-220001/005104/2026': {
    origem: 'De ofício',
    resumo:
      'Sindicância sobre irregularidades na concessão de diárias na SUBGAB. O sindicado também responde a PAD decorrente destes autos; o servidor que atestou o Relatório de Diárias figura como citado e tem co-lotação histórica com o sindicado (2019–2023).',
    partes: [
      { cod: 'SRV-9376', papel: 'Investigado', outros: ['SEI-220001/004821/2026'] },
      { cod: 'SRV-4386', papel: 'Citado', outros: ['SEI-220001/001945/2025'] },
    ],
    conexos: ['SEI-220001/001945/2025', 'SEI-220001/004821/2026'],
    docs: ['55443322'],
    leg: [],
    timeline: [
      {
        data: '12/01/2026',
        fato: 'Relatório de Diárias (doc. SEI 55443322) atestado pelo servidor citado',
      },
      { data: '30/03/2026', fato: 'Diligência da comissão; oitiva do servidor citado' },
    ],
    alertas: [
      'SRV-9376 e SRV-4386 aparecem, cada um, em 2 procedimentos',
      'Documento SEI nº 55443322 também é citado no PAD ...004821 — possível elo material',
      'Co-lotação histórica entre SRV-9376 e SRV-4386 (SUBGAB, 2019–2023) declarada em oitiva',
    ],
  },
  'SEI-220001/003310/2026': {
    origem: 'Representação',
    resumo:
      'Sindicância sobre irregularidades em aquisições de materiais na SUPLOG, com fundamento no art. 46 do DL 220/75. A sindicada também é investigada em IP posterior sobre desvio de materiais; a testemunha ouvida tem co-lotação com ela desde 2021.',
    partes: [
      {
        cod: 'SRV-4579',
        papel: 'Investigado',
        outros: ['SEI-220001/001945/2025', 'SEI-220001/004455/2026'],
      },
      { cod: 'SRV-4307', papel: 'Testemunha', outros: ['SEI-220001/004455/2026'] },
    ],
    conexos: ['SEI-220001/004455/2026'],
    docs: ['61220044', '61220077'],
    leg: ['art. 46 do Decreto-Lei nº 220/1975'],
    timeline: [{ data: '04/05/2026', fato: 'Instauração da sindicância; prazo de 30 dias' }],
    alertas: [
      'SRV-4579 aparece em 3 procedimentos (papéis: Investigado, Testemunha)',
      'Documento SEI nº 61220077 também é citado na IP ...004455 — possível elo material',
      'Testemunha SRV-4307 tem co-lotação com a sindicada (SUPLOG, desde 2021)',
    ],
  },
  'SEI-220001/004821/2026': {
    origem: 'Decorrente de sindicância',
    resumo:
      'PAD instaurado em 10/02/2026, com fundamento no art. 43 do DL 220/75 e art. 281 do Dec. 2.479/79, para apurar irregularidades na gestão de diárias apontadas na sindicância ...005104. O investigado responde simultaneamente aos dois procedimentos.',
    partes: [
      { cod: 'SRV-9376', papel: 'Investigado', outros: ['SEI-220001/005104/2026'] },
      { cod: 'SRV-0556', papel: 'Membro de comissão', outros: [] },
      { cod: 'SRV-5175', papel: 'Membro de comissão', outros: [] },
    ],
    conexos: ['SEI-220001/001945/2025', 'SEI-220001/005104/2026'],
    docs: ['55443322', '55448899'],
    leg: ['art. 43 do Decreto-Lei nº 220/1975', 'art. 281 do Decreto nº 2.479/1979'],
    timeline: [
      { data: '10/02/2026', fato: 'Publicação da Portaria de instauração; prazo de 60 dias' },
    ],
    alertas: [
      'SRV-9376 aparece em 2 procedimentos (Investigado em ambos)',
      'Documento SEI nº 55443322 também é citado na Sindicância ...005104 — possível elo material',
    ],
  },
  'SEI-220001/001945/2025': {
    origem: 'Representação da chefia',
    resumo:
      'PAD por suposta inassiduidade e descumprimento de deveres na SUBGAB, instaurado após representação da chefia em 18/09/2025. A testemunha ouvida em novembro é hoje investigada em dois procedimentos na SUPLOG.',
    partes: [
      { cod: 'SRV-4386', papel: 'Investigado', outros: ['SEI-220001/005104/2026'] },
      {
        cod: 'SRV-4579',
        papel: 'Testemunha',
        outros: ['SEI-220001/003310/2026', 'SEI-220001/004455/2026'],
      },
    ],
    conexos: ['SEI-220001/004821/2026', 'SEI-220001/005104/2026'],
    docs: [],
    leg: [],
    timeline: [
      { data: '18/09/2025', fato: 'Representação da chefia imediata; instauração do PAD' },
      { data: '12/11/2025', fato: 'Oitiva de testemunha (SRV-4579, lotada na SUPLOG)' },
    ],
    alertas: ['SRV-4386 aparece em 2 procedimentos; a testemunha SRV-4579 aparece em 3'],
  },
}
