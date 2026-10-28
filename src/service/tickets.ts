import type {
  Chamado,
  ChamadoComentario,
  ChamadoHistorico,
  ChamadoPrioridade,
  ChamadoStatus,
  Categoria,
  Prisma,
} from '@prisma/client';
import { prisma } from '../lib/prisma';
import { usuarioEhAdmin, usuarioEhAtendente } from './secoes';

export type ChamadoComRelacoes = Chamado & {
  categoria: Categoria | null;
  comentarios?: ChamadoComentario[];
  historico?: ChamadoHistorico[];
  ativos?: Array<{
    ativo: {
      id: string;
      numero: number;
      nome: string;
      tipo: string;
      status: string;
      numeroPatrimonio: string | null;
    };
  }>;
};

function serializarChamado(c: ChamadoComRelacoes) {
  return {
    id: c.id,
    numero: c.numero,
    titulo: c.titulo,
    descricao: c.descricao,
    status: c.status,
    prioridade: c.prioridade,
    solicitanteUsername: c.solicitanteUsername,
    solicitanteNome: c.solicitanteNome,
    atendenteUsername: c.atendenteUsername,
    atendenteNome: c.atendenteNome,
    secaoId: c.secaoId,
    ouCodigo: c.ouCodigo,
    categoriaId: c.categoriaId,
    categoria: c.categoria
      ? { id: c.categoria.id, nome: c.categoria.nome }
      : null,
    prazoRespostaEm: c.prazoRespostaEm,
    prazoSolucaoEm: c.prazoSolucaoEm,
    resolvidoEm: c.resolvidoEm,
    fechadoEm: c.fechadoEm,
    criadoEm: c.criadoEm,
    atualizadoEm: c.atualizadoEm,
    comentarios: c.comentarios?.map((cm) => ({
      id: cm.id,
      autorUsername: cm.autorUsername,
      autorNome: cm.autorNome,
      texto: cm.texto,
      interno: cm.interno,
      criadoEm: cm.criadoEm,
    })),
    historico: c.historico?.map((h) => ({
      id: h.id,
      autorUsername: h.autorUsername,
      campo: h.campo,
      valorAnterior: h.valorAnterior,
      valorNovo: h.valorNovo,
      criadoEm: h.criadoEm,
    })),
    ativos: c.ativos?.map((ca) => ({
      id: ca.ativo.id,
      numero: ca.ativo.numero,
      nome: ca.ativo.nome,
      tipo: ca.ativo.tipo,
      status: ca.ativo.status,
      numeroPatrimonio: ca.ativo.numeroPatrimonio,
    })),
  };
}

async function registrarHistorico(
  tx: Prisma.TransactionClient,
  chamadoId: string,
  autorUsername: string,
  campo: string,
  valorAnterior: string | null,
  valorNovo: string | null,
) {
  if (valorAnterior === valorNovo) return;
  await tx.chamadoHistorico.create({
    data: { chamadoId, autorUsername, campo, valorAnterior, valorNovo },
  });
}

export const ticketsService = {
  serializarChamado,

  async listarCategorias(): Promise<Categoria[]> {
    return prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  },

  async criarCategoria(data: {
    nome: string;
    descricao?: string;
    parentId?: string;
    ativo?: boolean;
  }): Promise<Categoria> {
    return prisma.categoria.create({
      data: {
        nome: data.nome,
        descricao: data.descricao,
        parentId: data.parentId,
        ativo: data.ativo ?? true,
      },
    });
  },

  async atualizarCategoria(
    id: string,
    data: {
      nome?: string;
      descricao?: string | null;
      parentId?: string | null;
      ativo?: boolean;
    },
  ): Promise<Categoria> {
    return prisma.categoria.update({ where: { id }, data });
  },

  async listar(opts: {
    username: string;
    papeis?: string[];
    secao?: string | null;
    status?: ChamadoStatus;
    prioridade?: ChamadoPrioridade;
    escopo: 'meus' | 'secao' | 'todos';
    busca?: string;
    limite: number;
    offset: number;
  }): Promise<ChamadoComRelacoes[]> {
    const where: Prisma.ChamadoWhereInput = {};

    if (opts.status) where.status = opts.status;
    if (opts.prioridade) where.prioridade = opts.prioridade;

    const admin = usuarioEhAdmin(opts.papeis);
    const atendente = usuarioEhAtendente(opts.papeis);

    if (opts.escopo === 'meus' || (!atendente && !admin)) {
      where.solicitanteUsername = opts.username;
    } else if (opts.escopo === 'secao') {
      if (!admin) {
        where.OR = [
          { ouCodigo: opts.secao ?? undefined },
          { solicitanteUsername: opts.username },
        ];
      } else if (opts.secao) {
        where.ouCodigo = opts.secao;
      }
    } else if (opts.escopo === 'todos' && !admin) {
      where.OR = [
        { ouCodigo: opts.secao ?? undefined },
        { solicitanteUsername: opts.username },
        { atendenteUsername: opts.username },
      ];
    }

    if (opts.busca) {
      const termo = opts.busca.trim();
      const numero = Number(termo);
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { titulo: { contains: termo, mode: 'insensitive' } },
            { descricao: { contains: termo, mode: 'insensitive' } },
            ...(Number.isFinite(numero) && numero > 0 ? [{ numero }] : []),
          ],
        },
      ];
    }

    return prisma.chamado.findMany({
      where,
      include: { categoria: true },
      orderBy: [{ atualizadoEm: 'desc' }],
      take: opts.limite,
      skip: opts.offset,
    });
  },

  async obter(
    id: string,
    opts: { username: string; papeis?: string[]; secao?: string | null },
  ): Promise<ChamadoComRelacoes | null> {
    const chamado = await prisma.chamado.findUnique({
      where: { id },
      include: {
        categoria: true,
        comentarios: { orderBy: { criadoEm: 'asc' } },
        historico: { orderBy: { criadoEm: 'desc' }, take: 50 },
        ativos: {
          include: {
            ativo: {
              select: {
                id: true,
                numero: true,
                nome: true,
                tipo: true,
                status: true,
                numeroPatrimonio: true,
              },
            },
          },
        },
      },
    });
    if (!chamado) return null;

    if (!podeVerChamado(chamado, opts)) return null;

    // Esconde comentários internos de quem não é atendente/admin
    if (!usuarioEhAtendente(opts.papeis)) {
      chamado.comentarios = chamado.comentarios.filter((c) => !c.interno);
    }

    return chamado;
  },

  async criar(opts: {
    titulo: string;
    descricao: string;
    prioridade?: ChamadoPrioridade;
    categoriaId?: string;
    username: string;
    displayName?: string | null;
    secaoId?: string | null;
    ouCodigo?: string | null;
  }): Promise<ChamadoComRelacoes> {
    const chamado = await prisma.chamado.create({
      data: {
        titulo: opts.titulo,
        descricao: opts.descricao,
        prioridade: opts.prioridade ?? 'media',
        categoriaId: opts.categoriaId,
        solicitanteUsername: opts.username,
        solicitanteNome: opts.displayName ?? null,
        secaoId: opts.secaoId ?? null,
        ouCodigo: opts.ouCodigo ?? null,
        historico: {
          create: {
            autorUsername: opts.username,
            campo: 'status',
            valorAnterior: null,
            valorNovo: 'novo',
          },
        },
      },
      include: { categoria: true },
    });
    return chamado;
  },

  async atualizar(
    id: string,
    patch: {
      status?: ChamadoStatus;
      prioridade?: ChamadoPrioridade;
      atendenteUsername?: string | null;
      atendenteNome?: string | null;
      categoriaId?: string | null;
      titulo?: string;
      descricao?: string;
    },
    autorUsername: string,
  ): Promise<ChamadoComRelacoes> {
    return prisma.$transaction(async (tx) => {
      const atual = await tx.chamado.findUniqueOrThrow({ where: { id } });

      if (patch.status !== undefined) {
        await registrarHistorico(
          tx,
          id,
          autorUsername,
          'status',
          atual.status,
          patch.status,
        );
      }
      if (patch.prioridade !== undefined) {
        await registrarHistorico(
          tx,
          id,
          autorUsername,
          'prioridade',
          atual.prioridade,
          patch.prioridade,
        );
      }
      if (patch.atendenteUsername !== undefined) {
        await registrarHistorico(
          tx,
          id,
          autorUsername,
          'atendente',
          atual.atendenteUsername,
          patch.atendenteUsername,
        );
      }

      const data: Prisma.ChamadoUpdateInput = {
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.prioridade !== undefined ? { prioridade: patch.prioridade } : {}),
        ...(patch.atendenteUsername !== undefined
          ? { atendenteUsername: patch.atendenteUsername }
          : {}),
        ...(patch.atendenteNome !== undefined
          ? { atendenteNome: patch.atendenteNome }
          : {}),
        ...(patch.titulo !== undefined ? { titulo: patch.titulo } : {}),
        ...(patch.descricao !== undefined ? { descricao: patch.descricao } : {}),
        ...(patch.categoriaId !== undefined
          ? patch.categoriaId
            ? { categoria: { connect: { id: patch.categoriaId } } }
            : { categoria: { disconnect: true } }
          : {}),
      };

      if (patch.status === 'resolvido' && !atual.resolvidoEm) {
        data.resolvidoEm = new Date();
      }
      if (patch.status === 'fechado' && !atual.fechadoEm) {
        data.fechadoEm = new Date();
      }
      if (
        patch.status === 'em_atendimento' &&
        !atual.atendenteUsername &&
        patch.atendenteUsername === undefined
      ) {
        data.atendenteUsername = autorUsername;
      }

      return tx.chamado.update({
        where: { id },
        data,
        include: { categoria: true },
      });
    });
  },

  async comentar(opts: {
    chamadoId: string;
    username: string;
    displayName?: string | null;
    texto: string;
    interno: boolean;
  }): Promise<ChamadoComentario> {
    return prisma.chamadoComentario.create({
      data: {
        chamadoId: opts.chamadoId,
        autorUsername: opts.username,
        autorNome: opts.displayName ?? null,
        texto: opts.texto,
        interno: opts.interno,
      },
    });
  },
};

function podeVerChamado(
  chamado: Chamado,
  opts: { username: string; papeis?: string[]; secao?: string | null },
): boolean {
  if (usuarioEhAdmin(opts.papeis)) return true;
  if (chamado.solicitanteUsername === opts.username) return true;
  if (chamado.atendenteUsername === opts.username) return true;
  if (
    usuarioEhAtendente(opts.papeis) &&
    opts.secao &&
    chamado.ouCodigo?.toUpperCase() === opts.secao.toUpperCase()
  ) {
    return true;
  }
  return false;
}

export function podeEditarChamado(
  chamado: Chamado,
  opts: { username: string; papeis?: string[]; secao?: string | null },
): boolean {
  if (usuarioEhAdmin(opts.papeis)) return true;
  if (
    usuarioEhAtendente(opts.papeis) &&
    opts.secao &&
    chamado.ouCodigo?.toUpperCase() === opts.secao.toUpperCase()
  ) {
    return true;
  }
  if (
    chamado.solicitanteUsername === opts.username &&
    (chamado.status === 'novo' || chamado.status === 'aguardando_solicitante')
  ) {
    return true;
  }
  return false;
}
