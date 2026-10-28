import type { SecaoAdMap } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  derivarPapeis,
  parseDn,
  resolverOuCodigo,
  type PapelUsuario,
} from '../lib/ad-dn';

export interface SeiUnidadeResumo {
  idUnidade: string;
  sigla: string;
}

export interface ContextoUsuario {
  secao: string | null;
  ouPath: string;
  ous: string[];
  seiUnidade: SeiUnidadeResumo | null;
  secaoId: string | null;
  papeis: PapelUsuario[];
  mapeamento: SecaoAdMap | null;
}

export async function resolverContextoUsuario(opts: {
  dn?: string | null;
  memberOf?: string | string[] | null;
}): Promise<ContextoUsuario> {
  const { ous, ouPath } = parseDn(opts.dn);
  const papeis = derivarPapeis(ous, opts.memberOf);

  const mapeamentos = await prisma.secaoAdMap.findMany({
    where: { ativo: true },
  });
  const codigos = new Set(mapeamentos.map((m) => m.ouCodigo.toUpperCase()));
  const secao = resolverOuCodigo(ous, codigos);

  const mapeamento =
    secao != null
      ? mapeamentos.find((m) => m.ouCodigo.toUpperCase() === secao) ?? null
      : null;

  const seiUnidade =
    mapeamento?.seiIdUnidade != null
      ? {
          idUnidade: mapeamento.seiIdUnidade,
          sigla: mapeamento.seiSigla ?? mapeamento.ouCodigo,
        }
      : null;

  return {
    secao,
    ouPath,
    ous,
    seiUnidade,
    secaoId: mapeamento?.id ?? null,
    papeis,
    mapeamento,
  };
}

export async function listarSecoes(apenasAtivas = true): Promise<SecaoAdMap[]> {
  return prisma.secaoAdMap.findMany({
    where: apenasAtivas ? { ativo: true } : undefined,
    orderBy: { ouCodigo: 'asc' },
  });
}

export async function obterSecaoPorOu(ouCodigo: string): Promise<SecaoAdMap | null> {
  return prisma.secaoAdMap.findUnique({
    where: { ouCodigo: ouCodigo.toUpperCase() },
  });
}

export async function criarSecao(data: {
  ouCodigo: string;
  nome: string;
  seiIdUnidade?: string | null;
  seiSigla?: string | null;
  ativo?: boolean;
}): Promise<SecaoAdMap> {
  return prisma.secaoAdMap.create({
    data: {
      ouCodigo: data.ouCodigo.toUpperCase(),
      nome: data.nome,
      seiIdUnidade: data.seiIdUnidade ?? null,
      seiSigla: data.seiSigla ?? null,
      ativo: data.ativo ?? true,
    },
  });
}

export async function atualizarSecao(
  id: string,
  data: {
    ouCodigo?: string;
    nome?: string;
    seiIdUnidade?: string | null;
    seiSigla?: string | null;
    ativo?: boolean;
  },
): Promise<SecaoAdMap> {
  return prisma.secaoAdMap.update({
    where: { id },
    data: {
      ...(data.ouCodigo !== undefined
        ? { ouCodigo: data.ouCodigo.toUpperCase() }
        : {}),
      ...(data.nome !== undefined ? { nome: data.nome } : {}),
      ...(data.seiIdUnidade !== undefined
        ? { seiIdUnidade: data.seiIdUnidade }
        : {}),
      ...(data.seiSigla !== undefined ? { seiSigla: data.seiSigla } : {}),
      ...(data.ativo !== undefined ? { ativo: data.ativo } : {}),
    },
  });
}

export async function removerSecao(id: string): Promise<void> {
  await prisma.secaoAdMap.delete({ where: { id } });
}

export function usuarioEhAdmin(papeis?: PapelUsuario[] | string[] | null): boolean {
  return Boolean(papeis?.includes('admin'));
}

export function usuarioEhAtendente(papeis?: PapelUsuario[] | string[] | null): boolean {
  return Boolean(papeis?.includes('atendente') || papeis?.includes('admin'));
}
