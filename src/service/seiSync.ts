import type { Processo } from '@prisma/client';
import { env } from '../config/env';
import { getSeiClient } from '../lib/sei';
import { SeiError, toSeiError } from '../lib/sei/errors';
import { parseDataHoraSei, parseDataSei, toArray } from '../lib/sei/normalize';
import type { Andamento as SeiAndamento, RetornoConsultaProcedimento } from '../lib/sei/types';
import { proximaSincronizacao, proximaTentativaAposFalha } from './seiAgenda';
import {
  andamentosRepo,
  eventosRepo,
  processosRepo,
  syncLogRepo,
  unidadesAbertasDe,
  type AndamentoInput,
  type UnidadeAberta,
} from './seiRepository';

export interface ResultadoSync {
  processoId: string;
  protocolo: string;
  sucesso: boolean;
  andamentosNovos: number;
  mudouUnidade: boolean;
  concluido: boolean;
  erro?: string;
  erroTipo?: string;
}

function mapAndamento(a: SeiAndamento): AndamentoInput {
  const atributos: Record<string, string> = {};
  for (const attr of toArray<{ Nome: string; Valor: string }>(a.Atributos)) {
    if (attr?.Nome) atributos[attr.Nome] = attr.Valor;
  }

  return {
    idAndamento: String(a.IdAndamento),
    idTarefa: a.IdTarefa ? String(a.IdTarefa) : null,
    descricao: a.Descricao ?? '',
    ocorridoEm: parseDataHoraSei(a.DataHora) ?? new Date(0),
    unidadeId: a.Unidade?.IdUnidade ? String(a.Unidade.IdUnidade) : null,
    unidadeSigla: a.Unidade?.Sigla ?? null,
    unidadeNome: a.Unidade?.Descricao ?? null,
    usuarioSigla: a.Usuario?.Sigla ?? null,
    usuarioNome: a.Usuario?.Nome ?? null,
    atributos,
  };
}

function mapUnidadesAbertas(retorno: RetornoConsultaProcedimento): UnidadeAberta[] {
  return toArray(retorno.UnidadesProcedimentoAberto).map((u: any) => ({
    idUnidade: String(u?.Unidade?.IdUnidade ?? ''),
    sigla: u?.Unidade?.Sigla ?? '',
    descricao: u?.Unidade?.Descricao ?? null,
    atribuidoA: u?.UsuarioAtribuicao?.Sigla ?? null,
  }));
}

const chaveUnidades = (us: UnidadeAberta[]): string =>
  us
    .map((u) => u.idUnidade)
    .sort()
    .join('|');

export async function sincronizarProcesso(processo: Processo): Promise<ResultadoSync> {
  const inicio = Date.now();
  const sei = getSeiClient();
  const primeiraVez = processo.idProcedimento === null;
  const unidadesAnteriores = unidadesAbertasDe(processo);

  try {
    const retorno = await sei.consultarProcedimento({
      ProtocoloProcedimento: processo.protocolo,
      SinRetornarUltimoAndamento: 'S',
      SinRetornarUnidadesProcedimentoAberto: 'S',
      SinRetornarAndamentoConclusao: 'S',
      SinRetornarAssuntos: primeiraVez ? 'S' : 'N',
      SinRetornarInteressados: primeiraVez ? 'S' : 'N',
      SinRetornarAndamentoGeracao: primeiraVez ? 'S' : 'N',
    });

    const unidadesAbertas = mapUnidadesAbertas(retorno);
    const ultimo = retorno.UltimoAndamento;
    const conclusao = retorno.AndamentoConclusao ?? null;
    const concluido = unidadesAbertas.length === 0;

    const mudouUltimoAndamento =
      !!ultimo && String(ultimo.IdAndamento) !== processo.ultimoAndamentoId;

    let paraInserir: AndamentoInput[] = [];

    if (mudouUltimoAndamento || primeiraVez) {
      const tarefas = env.SEI_TAREFAS_ANDAMENTO;

      if (tarefas.length > 0) {
        const lista = await sei.listarAndamentos({
          ProtocoloProcedimento: processo.protocolo,
          SinRetornarAtributos: 'S',
          Tarefas: tarefas,
        });
        paraInserir = lista.map(mapAndamento);
      }

      if (ultimo) {
        const jaTem = paraInserir.some((a) => a.idAndamento === String(ultimo.IdAndamento));
        if (!jaTem) paraInserir.push(mapAndamento(ultimo));
      }
      if (primeiraVez && retorno.AndamentoGeracao) {
        const ger = mapAndamento(retorno.AndamentoGeracao);
        if (!paraInserir.some((a) => a.idAndamento === ger.idAndamento)) paraInserir.push(ger);
      }
      if (conclusao) {
        const con = mapAndamento(conclusao);
        if (!paraInserir.some((a) => a.idAndamento === con.idAndamento)) paraInserir.push(con);
      }
    }

    const mudouUnidade = chaveUnidades(unidadesAbertas) !== chaveUnidades(unidadesAnteriores);
    const reabriu = processo.concluido && !concluido;
    const ultimoEm = ultimo ? parseDataHoraSei(ultimo.DataHora) : processo.ultimoAndamentoEm;

    const inseridos = await andamentosRepo.inserirNovos(processo.id, paraInserir);

    await processosRepo.atualizarDadosSei(processo.id, {
      idProcedimento: retorno.IdProcedimento ? String(retorno.IdProcedimento) : null,
      tipoProcedimentoId: retorno.TipoProcedimento?.IdTipoProcedimento
        ? String(retorno.TipoProcedimento.IdTipoProcedimento)
        : null,
      tipoProcedimentoNome: retorno.TipoProcedimento?.Nome ?? null,
      especificacao: retorno.Especificacao ?? null,
      dataAutuacao: parseDataSei(retorno.DataAutuacao),
      nivelAcessoGlobal:
        retorno.NivelAcessoGlobal !== undefined ? Number(retorno.NivelAcessoGlobal) : null,
      linkAcesso: retorno.LinkAcesso ?? null,
      concluido,
      unidadesAbertas,
      ultimoAndamentoId: ultimo ? String(ultimo.IdAndamento) : processo.ultimoAndamentoId,
      ultimoAndamentoEm: ultimoEm,
      ultimoAndamentoTexto: ultimo?.Descricao ?? processo.ultimoAndamentoTexto,
      proximaSincronizacao: proximaSincronizacao({
        ultimoAndamentoEm: ultimoEm,
        concluido,
      }),
    });

    if (!primeiraVez) {
      for (const a of inseridos) {
        await eventosRepo.registrar(processo.id, 'novo_andamento', {
          idAndamento: a.idAndamento,
          descricao: a.descricao,
          ocorridoEm: a.ocorridoEm,
          unidade: a.unidadeSigla,
        });
      }

      if (mudouUnidade) {
        await eventosRepo.registrar(processo.id, 'mudou_unidade', {
          de: unidadesAnteriores.map((u) => u.sigla),
          para: unidadesAbertas.map((u) => u.sigla),
        });
      }

      if (concluido && !processo.concluido) {
        await eventosRepo.registrar(processo.id, 'concluido', {
          em: conclusao ? parseDataHoraSei(conclusao.DataHora) : null,
        });
      }
    }

    if (reabriu) {
      await eventosRepo.registrar(processo.id, 'reaberto', {
        unidades: unidadesAbertas.map((u) => u.sigla),
      });
    }

    await syncLogRepo.registrar({
      processoId: processo.id,
      duracaoMs: Date.now() - inicio,
      sucesso: true,
      andamentosNovos: inseridos.length,
    });

    return {
      processoId: processo.id,
      protocolo: processo.protocolo,
      sucesso: true,
      andamentosNovos: primeiraVez ? 0 : inseridos.length,
      mudouUnidade: !primeiraVez && mudouUnidade,
      concluido,
    };
  } catch (err) {
    const seiErr: SeiError = err instanceof SeiError ? err : toSeiError('sincronizar', err);

    await processosRepo.registrarFalha(processo.id, {
      mensagem: seiErr.message.slice(0, 1000),
      tipo: seiErr.kind,
      permanente: seiErr.permanente,
      proxima: proximaTentativaAposFalha(processo.falhasConsecutivas + 1),
    });

    await eventosRepo.registrar(processo.id, 'erro_sincronizacao', {
      tipo: seiErr.kind,
      mensagem: seiErr.message,
      permanente: seiErr.permanente,
    });

    await syncLogRepo.registrar({
      processoId: processo.id,
      duracaoMs: Date.now() - inicio,
      sucesso: false,
      andamentosNovos: 0,
      erro: seiErr.message.slice(0, 1000),
      erroTipo: seiErr.kind,
    });

    return {
      processoId: processo.id,
      protocolo: processo.protocolo,
      sucesso: false,
      andamentosNovos: 0,
      mudouUnidade: false,
      concluido: processo.concluido,
      erro: seiErr.message,
      erroTipo: seiErr.kind,
    };
  }
}

export async function executarCiclo(): Promise<ResultadoSync[]> {
  const lote = await processosRepo.reservarLote(env.WORKER_BATCH_SIZE);
  if (lote.length === 0) return [];

  const resultados: ResultadoSync[] = [];
  const fila = [...lote];

  const trabalhador = async (): Promise<void> => {
    for (;;) {
      const proximo = fila.shift();
      if (!proximo) return;
      resultados.push(await sincronizarProcesso(proximo));
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(env.WORKER_CONCURRENCY, lote.length) }, trabalhador),
  );

  return resultados;
}
