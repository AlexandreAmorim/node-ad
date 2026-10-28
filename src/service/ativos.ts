import type {
  Ativo,
  AtivoStatus,
  AtivoTipo,
  Fabricante,
  Fornecedor,
  Localizacao,
  ModeloAtivo,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma';

export type AtivoComRelacoes = Ativo & {
  fabricante: Fabricante | null;
  modelo: ModeloAtivo | null;
  localizacao: Localizacao | null;
  fornecedor: Fornecedor | null;
};

function parseData(v?: string | null): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  return new Date(v);
}

export function serializarAtivo(a: AtivoComRelacoes) {
  return {
    id: a.id,
    numero: a.numero,
    nome: a.nome,
    tipo: a.tipo,
    status: a.status,
    numeroSerie: a.numeroSerie,
    numeroPatrimonio: a.numeroPatrimonio,
    numeroInventario: a.numeroInventario,
    fabricanteId: a.fabricanteId,
    fabricante: a.fabricante ? { id: a.fabricante.id, nome: a.fabricante.nome } : null,
    modeloId: a.modeloId,
    modelo: a.modelo ? { id: a.modelo.id, nome: a.modelo.nome, tipo: a.modelo.tipo } : null,
    localizacaoId: a.localizacaoId,
    localizacao: a.localizacao
      ? { id: a.localizacao.id, nome: a.localizacao.nome, codigo: a.localizacao.codigo }
      : null,
    fornecedorId: a.fornecedorId,
    fornecedor: a.fornecedor ? { id: a.fornecedor.id, nome: a.fornecedor.nome } : null,
    usuarioUsername: a.usuarioUsername,
    usuarioNome: a.usuarioNome,
    ouCodigo: a.ouCodigo,
    dataAquisicao: a.dataAquisicao,
    dataGarantia: a.dataGarantia,
    valor: a.valor != null ? Number(a.valor) : null,
    observacao: a.observacao,
    specs: a.specs,
    criadoEm: a.criadoEm,
    atualizadoEm: a.atualizadoEm,
  };
}

const includeRelacoes = {
  fabricante: true,
  modelo: true,
  localizacao: true,
  fornecedor: true,
} as const;

async function registrarHistorico(
  tx: Prisma.TransactionClient,
  ativoId: string,
  autorUsername: string,
  campo: string,
  valorAnterior: string | null,
  valorNovo: string | null,
) {
  if (valorAnterior === valorNovo) return;
  await tx.ativoHistorico.create({
    data: { ativoId, autorUsername, campo, valorAnterior, valorNovo },
  });
}

export const ativosService = {
  serializarAtivo,

  async listar(filtros: {
    tipo?: AtivoTipo;
    status?: AtivoStatus;
    ouCodigo?: string;
    /** Se definido, restringe aos ativos do usuário (case-insensitive). */
    usuarioUsername?: string;
    busca?: string;
    localizacaoId?: string;
    limite: number;
    offset: number;
  }): Promise<AtivoComRelacoes[]> {
    const and: Prisma.AtivoWhereInput[] = [];

    if (filtros.tipo) and.push({ tipo: filtros.tipo });
    if (filtros.status) and.push({ status: filtros.status });
    if (filtros.ouCodigo) and.push({ ouCodigo: filtros.ouCodigo });
    if (filtros.localizacaoId) and.push({ localizacaoId: filtros.localizacaoId });

    if (filtros.usuarioUsername) {
      and.push({
        usuarioUsername: {
          equals: filtros.usuarioUsername,
          mode: 'insensitive',
        },
      });
    }

    if (filtros.busca) {
      const termo = filtros.busca.trim();
      const numero = Number(termo);
      and.push({
        OR: [
          { nome: { contains: termo, mode: 'insensitive' } },
          { numeroSerie: { contains: termo, mode: 'insensitive' } },
          { numeroPatrimonio: { contains: termo, mode: 'insensitive' } },
          { numeroInventario: { contains: termo, mode: 'insensitive' } },
          ...(Number.isFinite(numero) && numero > 0 ? [{ numero }] : []),
        ],
      });
    }

    return prisma.ativo.findMany({
      where: and.length ? { AND: and } : {},
      include: includeRelacoes,
      orderBy: [{ atualizadoEm: 'desc' }],
      take: filtros.limite,
      skip: filtros.offset,
    });
  },

  /** true se o usuário pode ver o ativo (admin = tudo; senão só o atribuído a ele). */
  podeVerAtivo(
    ativo: { usuarioUsername: string | null },
    opts: { username: string; ehAdmin: boolean },
  ): boolean {
    if (opts.ehAdmin) return true;
    if (!ativo.usuarioUsername) return false;
    return ativo.usuarioUsername.toLowerCase() === opts.username.toLowerCase();
  },

  async obter(id: string): Promise<
    | (AtivoComRelacoes & {
        historico: Awaited<ReturnType<typeof prisma.ativoHistorico.findMany>>;
        chamados: Array<{ chamado: { id: string; numero: number; titulo: string; status: string } }>;
      })
    | null
  > {
    return prisma.ativo.findUnique({
      where: { id },
      include: {
        ...includeRelacoes,
        historico: { orderBy: { criadoEm: 'desc' }, take: 50 },
        chamados: {
          include: {
            chamado: {
              select: { id: true, numero: true, titulo: true, status: true },
            },
          },
        },
      },
    });
  },

  async criar(
    data: {
      nome: string;
      tipo?: AtivoTipo;
      status?: AtivoStatus;
      numeroSerie?: string | null;
      numeroPatrimonio?: string | null;
      numeroInventario?: string | null;
      fabricanteId?: string | null;
      modeloId?: string | null;
      localizacaoId?: string | null;
      fornecedorId?: string | null;
      usuarioUsername?: string | null;
      usuarioNome?: string | null;
      ouCodigo?: string | null;
      dataAquisicao?: string | null;
      dataGarantia?: string | null;
      valor?: number | null;
      observacao?: string | null;
      specs?: Record<string, unknown>;
    },
    autorUsername: string,
  ): Promise<AtivoComRelacoes> {
    const status = data.status ?? 'em_estoque';
    return prisma.$transaction(async (tx) => {
      const ativo = await tx.ativo.create({
        data: {
          nome: data.nome,
          tipo: data.tipo ?? 'computador',
          status,
          numeroSerie: data.numeroSerie ?? null,
          numeroPatrimonio: data.numeroPatrimonio ?? null,
          numeroInventario: data.numeroInventario ?? null,
          fabricanteId: data.fabricanteId ?? null,
          modeloId: data.modeloId ?? null,
          localizacaoId: data.localizacaoId ?? null,
          fornecedorId: data.fornecedorId ?? null,
          usuarioUsername: data.usuarioUsername ?? null,
          usuarioNome: data.usuarioNome ?? null,
          ouCodigo: data.ouCodigo ?? null,
          dataAquisicao: parseData(data.dataAquisicao) ?? null,
          dataGarantia: parseData(data.dataGarantia) ?? null,
          valor: data.valor ?? null,
          observacao: data.observacao ?? null,
          specs: (data.specs ?? {}) as Prisma.InputJsonValue,
          historico: {
            create: {
              autorUsername,
              campo: 'status',
              valorAnterior: null,
              valorNovo: status,
            },
          },
        },
        include: includeRelacoes,
      });
      return ativo;
    });
  },

  async atualizar(
    id: string,
    patch: Record<string, unknown>,
    autorUsername: string,
  ): Promise<AtivoComRelacoes> {
    return prisma.$transaction(async (tx) => {
      const atual = await tx.ativo.findUniqueOrThrow({ where: { id } });

      const camposAuditaveis = [
        'status',
        'usuarioUsername',
        'localizacaoId',
        'nome',
        'tipo',
      ] as const;

      for (const campo of camposAuditaveis) {
        if (patch[campo] !== undefined) {
          await registrarHistorico(
            tx,
            id,
            autorUsername,
            campo,
            String((atual as any)[campo] ?? ''),
            patch[campo] == null ? null : String(patch[campo]),
          );
        }
      }

      const data: Prisma.AtivoUpdateInput = {};
      if (patch.nome !== undefined) data.nome = patch.nome as string;
      if (patch.tipo !== undefined) data.tipo = patch.tipo as AtivoTipo;
      if (patch.status !== undefined) data.status = patch.status as AtivoStatus;
      if (patch.numeroSerie !== undefined) data.numeroSerie = patch.numeroSerie as string | null;
      if (patch.numeroPatrimonio !== undefined)
        data.numeroPatrimonio = patch.numeroPatrimonio as string | null;
      if (patch.numeroInventario !== undefined)
        data.numeroInventario = patch.numeroInventario as string | null;
      if (patch.usuarioUsername !== undefined)
        data.usuarioUsername = patch.usuarioUsername as string | null;
      if (patch.usuarioNome !== undefined) data.usuarioNome = patch.usuarioNome as string | null;
      if (patch.ouCodigo !== undefined) data.ouCodigo = patch.ouCodigo as string | null;
      if (patch.observacao !== undefined) data.observacao = patch.observacao as string | null;
      if (patch.valor !== undefined) data.valor = patch.valor as number | null;
      if (patch.specs !== undefined) data.specs = patch.specs as Prisma.InputJsonValue;
      if (patch.dataAquisicao !== undefined)
        data.dataAquisicao = parseData(patch.dataAquisicao as string | null) ?? null;
      if (patch.dataGarantia !== undefined)
        data.dataGarantia = parseData(patch.dataGarantia as string | null) ?? null;

      if (patch.fabricanteId !== undefined) {
        data.fabricante = patch.fabricanteId
          ? { connect: { id: patch.fabricanteId as string } }
          : { disconnect: true };
      }
      if (patch.modeloId !== undefined) {
        data.modelo = patch.modeloId
          ? { connect: { id: patch.modeloId as string } }
          : { disconnect: true };
      }
      if (patch.localizacaoId !== undefined) {
        data.localizacao = patch.localizacaoId
          ? { connect: { id: patch.localizacaoId as string } }
          : { disconnect: true };
      }
      if (patch.fornecedorId !== undefined) {
        data.fornecedor = patch.fornecedorId
          ? { connect: { id: patch.fornecedorId as string } }
          : { disconnect: true };
      }

      // Ao atribuir usuário, marca em uso automaticamente se ainda estiver em estoque
      if (
        patch.usuarioUsername &&
        patch.status === undefined &&
        atual.status === 'em_estoque'
      ) {
        data.status = 'em_uso';
        await registrarHistorico(tx, id, autorUsername, 'status', atual.status, 'em_uso');
      }

      return tx.ativo.update({
        where: { id },
        data,
        include: includeRelacoes,
      });
    });
  },

  async remover(id: string): Promise<void> {
    await prisma.ativo.delete({ where: { id } });
  },

  async listarFabricantes() {
    return prisma.fabricante.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async criarFabricante(data: { nome: string; site?: string }) {
    return prisma.fabricante.create({
      data: { nome: data.nome, site: data.site || null },
    });
  },

  async listarModelos(tipo?: AtivoTipo) {
    return prisma.modeloAtivo.findMany({
      where: { ativo: true, ...(tipo ? { tipo } : {}) },
      include: { fabricante: true },
      orderBy: { nome: 'asc' },
    });
  },

  async criarModelo(data: { nome: string; tipo?: AtivoTipo; fabricanteId?: string }) {
    return prisma.modeloAtivo.create({
      data: {
        nome: data.nome,
        tipo: data.tipo ?? 'computador',
        fabricanteId: data.fabricanteId,
      },
      include: { fabricante: true },
    });
  },

  async listarLocalizacoes() {
    return prisma.localizacao.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async criarLocalizacao(data: {
    nome: string;
    codigo?: string;
    parentId?: string;
    endereco?: string;
  }) {
    return prisma.localizacao.create({ data });
  },

  async listarFornecedores() {
    return prisma.fornecedor.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async criarFornecedor(data: {
    nome: string;
    cnpj?: string;
    contato?: string;
    email?: string;
    telefone?: string;
  }) {
    return prisma.fornecedor.create({
      data: {
        nome: data.nome,
        cnpj: data.cnpj,
        contato: data.contato,
        email: data.email || null,
        telefone: data.telefone,
      },
    });
  },

  async vincularChamado(chamadoId: string, ativoId: string) {
    return prisma.chamadoAtivo.upsert({
      where: { chamadoId_ativoId: { chamadoId, ativoId } },
      create: { chamadoId, ativoId },
      update: {},
      include: {
        ativo: { include: includeRelacoes },
      },
    });
  },

  async desvincularChamado(chamadoId: string, ativoId: string) {
    await prisma.chamadoAtivo.delete({
      where: { chamadoId_ativoId: { chamadoId, ativoId } },
    });
  },

  async ativosDoChamado(chamadoId: string) {
    const rows = await prisma.chamadoAtivo.findMany({
      where: { chamadoId },
      include: { ativo: { include: includeRelacoes } },
    });
    return rows.map((r) => r.ativo);
  },

  async resumo(opts?: { usuarioUsername?: string }) {
    const where: Prisma.AtivoWhereInput = opts?.usuarioUsername
      ? {
          usuarioUsername: {
            equals: opts.usuarioUsername,
            mode: 'insensitive',
          },
        }
      : {};

    const [porStatus, porTipo, total] = await Promise.all([
      prisma.ativo.groupBy({ by: ['status'], where, _count: true }),
      prisma.ativo.groupBy({ by: ['tipo'], where, _count: true }),
      prisma.ativo.count({ where }),
    ]);
    return {
      total,
      porStatus: Object.fromEntries(porStatus.map((r) => [r.status, r._count])),
      porTipo: Object.fromEntries(porTipo.map((r) => [r.tipo, r._count])),
    };
  },
};
