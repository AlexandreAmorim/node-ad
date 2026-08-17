import { Prisma, type Andamento, type Evento, type EventoTipo, type Processo } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { somenteDigitos } from '../lib/sei/normalize';

export interface UnidadeAberta {
  idUnidade: string;
  sigla: string;
  descricao: string | null;
  atribuidoA: string | null;
}

export function unidadesAbertasDe(processo: Processo): UnidadeAberta[] {
  const raw = processo.unidadesAbertas;
  if (!Array.isArray(raw)) return [];
  return raw as unknown as UnidadeAberta[];
}

export interface CriarProcessoInput {
  protocolo: string;
  rotulo?: string | null;
  observacaoInterna?: string | null;
}

export interface AndamentoInput {
  idAndamento: string;
  idTarefa: string | null;
  descricao: string;
  ocorridoEm: Date;
  unidadeId: string | null;
  unidadeSigla: string | null;
  unidadeNome: string | null;
  usuarioSigla: string | null;
  usuarioNome: string | null;
  atributos: Record<string, string>;
}

/** Row bruta do SQL (snake_case) → modelo Prisma Processo. */
function mapProcessoRaw(row: Record<string, unknown>): Processo {
  return {
    id: String(row.id),
    protocolo: String(row.protocolo),
    protocoloDigitos: String(row.protocolo_digitos),
    idProcedimento: row.id_procedimento != null ? String(row.id_procedimento) : null,
    tipoProcedimentoId: row.tipo_procedimento_id != null ? String(row.tipo_procedimento_id) : null,
    tipoProcedimentoNome:
      row.tipo_procedimento_nome != null ? String(row.tipo_procedimento_nome) : null,
    especificacao: row.especificacao != null ? String(row.especificacao) : null,
    dataAutuacao: row.data_autuacao ? new Date(String(row.data_autuacao)) : null,
    nivelAcessoGlobal: row.nivel_acesso_global != null ? Number(row.nivel_acesso_global) : null,
    linkAcesso: row.link_acesso != null ? String(row.link_acesso) : null,
    concluido: Boolean(row.concluido),
    unidadesAbertas: (row.unidades_abertas ?? []) as Prisma.JsonValue,
    ultimoAndamentoId: row.ultimo_andamento_id != null ? String(row.ultimo_andamento_id) : null,
    ultimoAndamentoEm: row.ultimo_andamento_em
      ? new Date(String(row.ultimo_andamento_em))
      : null,
    ultimoAndamentoTexto:
      row.ultimo_andamento_texto != null ? String(row.ultimo_andamento_texto) : null,
    ativo: Boolean(row.ativo),
    rotulo: row.rotulo != null ? String(row.rotulo) : null,
    observacaoInterna: row.observacao_interna != null ? String(row.observacao_interna) : null,
    sincronizadoEm: row.sincronizado_em ? new Date(String(row.sincronizado_em)) : null,
    proximaSincronizacao: new Date(String(row.proxima_sincronizacao)),
    falhasConsecutivas: Number(row.falhas_consecutivas ?? 0),
    ultimoErro: row.ultimo_erro != null ? String(row.ultimo_erro) : null,
    ultimoErroTipo: row.ultimo_erro_tipo != null ? String(row.ultimo_erro_tipo) : null,
    criadoEm: new Date(String(row.criado_em)),
    atualizadoEm: new Date(String(row.atualizado_em)),
  };
}

function mapAndamentoRaw(row: Record<string, unknown>): Andamento {
  return {
    id: BigInt(String(row.id)),
    processoId: String(row.processo_id),
    idAndamento: String(row.id_andamento),
    idTarefa: row.id_tarefa != null ? String(row.id_tarefa) : null,
    descricao: String(row.descricao),
    ocorridoEm: new Date(String(row.ocorrido_em)),
    unidadeId: row.unidade_id != null ? String(row.unidade_id) : null,
    unidadeSigla: row.unidade_sigla != null ? String(row.unidade_sigla) : null,
    unidadeNome: row.unidade_nome != null ? String(row.unidade_nome) : null,
    usuarioSigla: row.usuario_sigla != null ? String(row.usuario_sigla) : null,
    usuarioNome: row.usuario_nome != null ? String(row.usuario_nome) : null,
    atributos: (row.atributos ?? {}) as Prisma.JsonValue,
    registradoEm: new Date(String(row.registrado_em)),
  };
}

export const processosRepo = {
  async criar(input: CriarProcessoInput): Promise<Processo> {
    const digitos = somenteDigitos(input.protocolo);
    const existente = await prisma.processo.findUnique({
      where: { protocolo: input.protocolo },
    });

    if (existente) {
      return prisma.processo.update({
        where: { id: existente.id },
        data: {
          ativo: true,
          rotulo: input.rotulo ?? existente.rotulo,
          observacaoInterna: input.observacaoInterna ?? existente.observacaoInterna,
          proximaSincronizacao:
            existente.proximaSincronizacao < new Date()
              ? existente.proximaSincronizacao
              : new Date(),
          falhasConsecutivas: 0,
        },
      });
    }

    return prisma.processo.create({
      data: {
        protocolo: input.protocolo,
        protocoloDigitos: digitos,
        rotulo: input.rotulo ?? null,
        observacaoInterna: input.observacaoInterna ?? null,
      },
    });
  },

  async porId(id: string): Promise<Processo | null> {
    return prisma.processo.findUnique({ where: { id } });
  },

  async listar(filtros: {
    ativo?: boolean;
    concluido?: boolean;
    busca?: string;
    limite?: number;
    offset?: number;
  } = {}): Promise<Processo[]> {
    const where: Prisma.ProcessoWhereInput = {};

    if (filtros.ativo !== undefined) where.ativo = filtros.ativo;
    if (filtros.concluido !== undefined) where.concluido = filtros.concluido;

    if (filtros.busca) {
      const digitos = somenteDigitos(filtros.busca);
      where.OR = [
        { especificacao: { contains: filtros.busca, mode: 'insensitive' } },
        { rotulo: { contains: filtros.busca, mode: 'insensitive' } },
        ...(digitos ? [{ protocoloDigitos: { contains: digitos } }] : []),
      ];
    }

    const lista = await prisma.processo.findMany({
      where,
      take: filtros.limite ?? 100,
      skip: filtros.offset ?? 0,
      orderBy: [{ ultimoAndamentoEm: 'desc' }, { criadoEm: 'desc' }],
    });

    return lista;
  },

  async reservarLote(limite: number): Promise<Processo[]> {
    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `update processo p
          set proxima_sincronizacao = now() + interval '5 minutes'
        where p.id in (
          select id from processo
           where ativo
             and not concluido
             and proxima_sincronizacao <= now()
           order by proxima_sincronizacao
           limit $1
           for update skip locked
        )
      returning p.*`,
      limite,
    );
    return rows.map(mapProcessoRaw);
  },

  async atualizarDadosSei(
    id: string,
    dados: {
      idProcedimento: string | null;
      tipoProcedimentoId: string | null;
      tipoProcedimentoNome: string | null;
      especificacao: string | null;
      dataAutuacao: string | null;
      nivelAcessoGlobal: number | null;
      linkAcesso: string | null;
      concluido: boolean;
      unidadesAbertas: UnidadeAberta[];
      ultimoAndamentoId: string | null;
      ultimoAndamentoEm: Date | null;
      ultimoAndamentoTexto: string | null;
      proximaSincronizacao: Date;
    },
  ): Promise<void> {
    await prisma.processo.update({
      where: { id },
      data: {
        idProcedimento: dados.idProcedimento,
        tipoProcedimentoId: dados.tipoProcedimentoId,
        tipoProcedimentoNome: dados.tipoProcedimentoNome,
        especificacao: dados.especificacao,
        dataAutuacao: dados.dataAutuacao ? new Date(dados.dataAutuacao) : null,
        nivelAcessoGlobal: dados.nivelAcessoGlobal,
        linkAcesso: dados.linkAcesso,
        concluido: dados.concluido,
        unidadesAbertas: dados.unidadesAbertas as unknown as Prisma.InputJsonValue,
        ultimoAndamentoId: dados.ultimoAndamentoId,
        ultimoAndamentoEm: dados.ultimoAndamentoEm,
        ultimoAndamentoTexto: dados.ultimoAndamentoTexto,
        sincronizadoEm: new Date(),
        proximaSincronizacao: dados.proximaSincronizacao,
        falhasConsecutivas: 0,
        ultimoErro: null,
        ultimoErroTipo: null,
      },
    });
  },

  async registrarFalha(
    id: string,
    erro: { mensagem: string; tipo: string; permanente: boolean; proxima: Date },
  ): Promise<void> {
    await prisma.$executeRawUnsafe(
      `update processo set
         falhas_consecutivas   = falhas_consecutivas + 1,
         ultimo_erro           = $2,
         ultimo_erro_tipo      = $3,
         sincronizado_em       = now(),
         proxima_sincronizacao = $4,
         ativo                 = case when $5::boolean then false else ativo end
       where id = $1::uuid`,
      id,
      erro.mensagem,
      erro.tipo,
      erro.proxima,
      erro.permanente,
    );
  },

  async definirAtivo(id: string, ativo: boolean): Promise<Processo | null> {
    try {
      return await prisma.processo.update({
        where: { id },
        data: {
          ativo,
          ...(ativo
            ? { falhasConsecutivas: 0, proximaSincronizacao: new Date() }
            : {}),
        },
      });
    } catch {
      return null;
    }
  },

  async remover(id: string): Promise<boolean> {
    try {
      await prisma.processo.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};

export const andamentosRepo = {
  async inserirNovos(processoId: string, itens: AndamentoInput[]): Promise<Andamento[]> {
    if (itens.length === 0) return [];

    const cols = 11;
    const values: string[] = [];
    const params: unknown[] = [];

    itens.forEach((a, i) => {
      const base = i * cols;
      values.push(
        `($${base + 1}::uuid,$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11}::jsonb)`,
      );
      params.push(
        processoId,
        a.idAndamento,
        a.idTarefa,
        a.descricao,
        a.ocorridoEm,
        a.unidadeId,
        a.unidadeSigla,
        a.unidadeNome,
        a.usuarioSigla,
        a.usuarioNome,
        JSON.stringify(a.atributos ?? {}),
      );
    });

    const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `insert into andamento
         (processo_id, id_andamento, id_tarefa, descricao, ocorrido_em,
          unidade_id, unidade_sigla, unidade_nome, usuario_sigla, usuario_nome, atributos)
       values ${values.join(',')}
       on conflict (processo_id, id_andamento) do nothing
       returning *`,
      ...params,
    );

    return rows.map(mapAndamentoRaw);
  },

  async listar(
    processoId: string,
    opts: { limite?: number; offset?: number } = {},
  ): Promise<Andamento[]> {
    return prisma.andamento.findMany({
      where: { processoId },
      orderBy: [{ ocorridoEm: 'desc' }, { id: 'desc' }],
      take: opts.limite ?? 200,
      skip: opts.offset ?? 0,
    });
  },
};

export const eventosRepo = {
  async registrar(
    processoId: string,
    tipo: EventoTipo,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await prisma.evento.create({
      data: {
        processoId,
        tipo,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  },

  async doProcesso(processoId: string, limite = 50): Promise<Evento[]> {
    return prisma.evento.findMany({
      where: { processoId },
      orderBy: { criadoEm: 'desc' },
      take: limite,
    });
  },
};

export const syncLogRepo = {
  async registrar(entrada: {
    processoId: string | null;
    duracaoMs: number;
    sucesso: boolean;
    andamentosNovos: number;
    erro?: string | null;
    erroTipo?: string | null;
  }): Promise<void> {
    await prisma.syncLog.create({
      data: {
        processoId: entrada.processoId,
        duracaoMs: entrada.duracaoMs,
        sucesso: entrada.sucesso,
        andamentosNovos: entrada.andamentosNovos,
        erro: entrada.erro ?? null,
        erroTipo: entrada.erroTipo ?? null,
      },
    });
  },
};
