import { prisma } from '../src/lib/prisma';
import { processosRepo } from '../src/service/seiRepository';
import { sincronizarProcesso } from '../src/service/seiSync';

/**
 * Seed: seções AD↔SEI, categorias de chamado e processos SEI de exemplo.
 * Com SEI_MOCK=true popula o banco sem tocar no SEI real.
 */

const SECOES = [
  {
    ouCodigo: 'ASSTIC',
    nome: 'Assessoria de Tecnologia da Informação e Comunicação',
    seiIdUnidade: '1',
    seiSigla: 'SEGOV/ASSTIC',
  },
  {
    ouCodigo: 'ASSJUR',
    nome: 'Assessoria Jurídica',
    seiIdUnidade: '2',
    seiSigla: 'SEGOV/ASSJUR',
  },
  {
    ouCodigo: 'SUBGAB',
    nome: 'Subchefia de Gabinete',
    seiIdUnidade: '3',
    seiSigla: 'SEGOV/SUBGAB',
  },
  {
    ouCodigo: 'PROT',
    nome: 'Protocolo',
    seiIdUnidade: '4',
    seiSigla: 'SEGOV/PROT',
  },
];

const CATEGORIAS = [
  { nome: 'Senha / Active Directory', descricao: 'Reset, desbloqueio e troca de senha' },
  { nome: 'Acesso a sistemas', descricao: 'Solicitação de acesso a SEI, e-mail, VPN, etc.' },
  { nome: 'Hardware', descricao: 'Computadores, impressoras, periféricos' },
  { nome: 'Rede / Conectividade', descricao: 'Internet, Wi-Fi, cabo de rede' },
  { nome: 'Software', descricao: 'Instalação e suporte a aplicativos' },
  { nome: 'Outros', descricao: 'Demais solicitações de TI' },
];

const EXEMPLOS = [
  { protocolo: '12.1.000000077-4', rotulo: 'Contrato de manutenção' },
  { protocolo: '12.1.000000078-2', rotulo: 'Solicitação de licença' },
  { protocolo: '11.1.000000293-2', rotulo: 'Processo antigo' },
  { protocolo: '00.0.000000000-0', rotulo: 'Protocolo inválido (teste de erro)' },
];

async function seedSecoes(): Promise<void> {
  for (const s of SECOES) {
    await prisma.secaoAdMap.upsert({
      where: { ouCodigo: s.ouCodigo },
      create: s,
      update: {
        nome: s.nome,
        seiIdUnidade: s.seiIdUnidade,
        seiSigla: s.seiSigla,
        ativo: true,
      },
    });
    console.log(`seção ${s.ouCodigo} ok`);
  }
}

async function seedCategorias(): Promise<void> {
  for (const c of CATEGORIAS) {
    const existente = await prisma.categoria.findFirst({
      where: { nome: c.nome },
    });
    if (existente) {
      console.log(`categoria "${c.nome}" já existe`);
      continue;
    }
    await prisma.categoria.create({ data: c });
    console.log(`categoria "${c.nome}" ok`);
  }
}

async function seedProcessos(): Promise<void> {
  for (const ex of EXEMPLOS) {
    const p = await processosRepo.criar(ex);
    const r = await sincronizarProcesso(p);
    console.log(
      `${ex.protocolo.padEnd(22)} ${r.sucesso ? 'ok' : `FALHOU (${r.erroTipo})`}` +
        `${r.sucesso ? ` — ${r.concluido ? 'concluído' : 'em andamento'}` : ''}`,
    );
  }
}

async function seedCmdb(): Promise<void> {
  const fabricantes = ['Dell', 'HP', 'Lenovo', 'Cisco', 'Apple', 'Samsung'];
  for (const nome of fabricantes) {
    await prisma.fabricante.upsert({
      where: { nome },
      create: { nome },
      update: { ativo: true },
    });
  }
  console.log('fabricantes ok');

  const dell = await prisma.fabricante.findUniqueOrThrow({ where: { nome: 'Dell' } });
  const hp = await prisma.fabricante.findUniqueOrThrow({ where: { nome: 'HP' } });
  const cisco = await prisma.fabricante.findUniqueOrThrow({ where: { nome: 'Cisco' } });

  const modelos = [
    { nome: 'Latitude 5440', tipo: 'computador' as const, fabricanteId: dell.id },
    { nome: 'OptiPlex 7010', tipo: 'computador' as const, fabricanteId: dell.id },
    { nome: 'EliteDisplay E24', tipo: 'monitor' as const, fabricanteId: hp.id },
    { nome: 'LaserJet Pro M404', tipo: 'impressora' as const, fabricanteId: hp.id },
    { nome: 'Catalyst 2960', tipo: 'rede' as const, fabricanteId: cisco.id },
  ];

  for (const m of modelos) {
    const existe = await prisma.modeloAtivo.findFirst({
      where: { nome: m.nome, fabricanteId: m.fabricanteId, tipo: m.tipo },
    });
    if (!existe) {
      await prisma.modeloAtivo.create({ data: m });
    }
  }
  console.log('modelos ok');

  const locais = [
    { nome: 'SEGOV — Sede', codigo: 'SEGOV' },
    { nome: 'ASSTIC — Sala TI', codigo: 'ASSTIC-TI' },
    { nome: 'Depósito / Estoque', codigo: 'ESTOQUE' },
  ];
  for (const l of locais) {
    await prisma.localizacao.upsert({
      where: { codigo: l.codigo },
      create: l,
      update: { nome: l.nome, ativo: true },
    });
  }
  console.log('localizações ok');

  await prisma.fornecedor.upsert({
    where: { nome: 'Fornecedor Demo TI' },
    create: { nome: 'Fornecedor Demo TI', contato: 'Suporte', email: 'suporte@demo.local' },
    update: { ativo: true },
  });

  const estoque = await prisma.localizacao.findUniqueOrThrow({ where: { codigo: 'ESTOQUE' } });
  const salaTi = await prisma.localizacao.findUniqueOrThrow({ where: { codigo: 'ASSTIC-TI' } });
  const modeloNotebook = await prisma.modeloAtivo.findFirstOrThrow({
    where: { nome: 'Latitude 5440' },
  });
  const modeloMonitor = await prisma.modeloAtivo.findFirstOrThrow({
    where: { nome: 'EliteDisplay E24' },
  });

  const exemplosAtivos = [
    {
      nome: 'Notebook ASSTIC 01',
      tipo: 'computador' as const,
      status: 'em_uso' as const,
      numeroSerie: 'DLL-SN-001',
      numeroPatrimonio: 'PAT-10001',
      fabricanteId: dell.id,
      modeloId: modeloNotebook.id,
      localizacaoId: salaTi.id,
      usuarioUsername: 'milton.amorim',
      usuarioNome: 'Milton Alexandre de Amorim',
      ouCodigo: 'ASSTIC',
      specs: { cpu: 'i7', ramGb: 16, disco: '512GB SSD' },
    },
    {
      nome: 'Monitor HP 24"',
      tipo: 'monitor' as const,
      status: 'em_estoque' as const,
      numeroSerie: 'HP-MON-002',
      numeroPatrimonio: 'PAT-10002',
      fabricanteId: hp.id,
      modeloId: modeloMonitor.id,
      localizacaoId: estoque.id,
      ouCodigo: 'ASSTIC',
      specs: { polegadas: 24 },
    },
  ];

  for (const a of exemplosAtivos) {
    const existe = await prisma.ativo.findFirst({
      where: { numeroPatrimonio: a.numeroPatrimonio },
    });
    if (existe) {
      console.log(`ativo ${a.numeroPatrimonio} já existe`);
      continue;
    }
    await prisma.ativo.create({ data: a });
    console.log(`ativo ${a.numeroPatrimonio} ok`);
  }
}

async function main(): Promise<void> {
  await seedSecoes();
  await seedCategorias();
  await seedCmdb();
  await seedProcessos();
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
