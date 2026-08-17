import type { Andamento, Evento, Processo } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import {
  criarProcessoBodySchema,
  listarProcessosQuerySchema,
  patchProcessoBodySchema,
} from '../schemas/sei.schemas';
import {
  andamentosRepo,
  eventosRepo,
  processosRepo,
  unidadesAbertasDe,
} from '../service/seiRepository';
import { sincronizarProcesso } from '../service/seiSync';

const serializarProcesso = (p: Processo) => ({
  id: p.id,
  protocolo: p.protocolo,
  idProcedimento: p.idProcedimento,
  tipoProcedimento: p.tipoProcedimentoNome,
  especificacao: p.especificacao,
  dataAutuacao: p.dataAutuacao,
  nivelAcessoGlobal: p.nivelAcessoGlobal,
  linkAcesso: p.linkAcesso,
  concluido: p.concluido,
  unidadesAbertas: unidadesAbertasDe(p),
  ultimoAndamento: p.ultimoAndamentoId
    ? { id: p.ultimoAndamentoId, em: p.ultimoAndamentoEm, texto: p.ultimoAndamentoTexto }
    : null,
  ativo: p.ativo,
  rotulo: p.rotulo,
  observacaoInterna: p.observacaoInterna,
  sincronizadoEm: p.sincronizadoEm,
  proximaSincronizacao: p.proximaSincronizacao,
  falhasConsecutivas: p.falhasConsecutivas,
  ultimoErro: p.ultimoErro ? { mensagem: p.ultimoErro, tipo: p.ultimoErroTipo } : null,
  criadoEm: p.criadoEm,
});

const serializarAndamento = (a: Andamento) => ({
  id: Number(a.id),
  idAndamento: a.idAndamento,
  idTarefa: a.idTarefa,
  descricao: a.descricao,
  ocorridoEm: a.ocorridoEm,
  unidade: a.unidadeSigla
    ? { id: a.unidadeId, sigla: a.unidadeSigla, nome: a.unidadeNome }
    : null,
  usuario: a.usuarioSigla ? { sigla: a.usuarioSigla, nome: a.usuarioNome } : null,
  atributos: a.atributos,
});

const serializarEvento = (e: Evento) => ({
  id: Number(e.id),
  processoId: e.processoId,
  tipo: e.tipo,
  payload: e.payload,
  criadoEm: e.criadoEm,
  processadoEm: e.processadoEm,
});

function zodReply(reply: any, err: ZodError) {
  return reply.status(400).send({
    erro: 'Requisição inválida',
    detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
}

export async function seiRoutes(app: FastifyInstance) {
  app.get(
    '/processos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const q = listarProcessosQuerySchema.parse(request.query);
        const lista = await processosRepo.listar({
          ativo: q.ativo === undefined ? undefined : q.ativo === 'true',
          concluido: q.concluido === undefined ? undefined : q.concluido === 'true',
          busca: q.busca,
          limite: q.limite,
          offset: q.offset,
        });
        return reply.send({ dados: lista.map(serializarProcesso) });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.post(
    '/processos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const body = criarProcessoBodySchema.parse(request.body);
        let processo = await processosRepo.criar({
          protocolo: body.protocolo.trim(),
          rotulo: body.rotulo ?? null,
          observacaoInterna: body.observacaoInterna ?? null,
        });

        if (body.sincronizarAgora) {
          const resultado = await sincronizarProcesso(processo);
          processo = (await processosRepo.porId(processo.id))!;

          if (!resultado.sucesso) {
            return reply.status(202).send({
              dado: serializarProcesso(processo),
              aviso: { tipo: resultado.erroTipo, mensagem: resultado.erro },
            });
          }
        }

        return reply.status(201).send({ dado: serializarProcesso(processo) });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.get(
    '/processos/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const processo = await processosRepo.porId(id);
      if (!processo) return reply.status(404).send({ erro: 'Processo não encontrado' });
      return reply.send({ dado: serializarProcesso(processo) });
    },
  );

  app.get(
    '/processos/:id/andamentos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const processo = await processosRepo.porId(id);
      if (!processo) return reply.status(404).send({ erro: 'Processo não encontrado' });

      const limite = Math.min(Number((request.query as { limite?: string }).limite ?? 200), 500);
      const lista = await andamentosRepo.listar(processo.id, { limite });
      return reply.send({ dados: lista.map(serializarAndamento) });
    },
  );

  app.get(
    '/processos/:id/eventos',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const processo = await processosRepo.porId(id);
      if (!processo) return reply.status(404).send({ erro: 'Processo não encontrado' });
      const lista = await eventosRepo.doProcesso(processo.id);
      return reply.send({ dados: lista.map(serializarEvento) });
    },
  );

  app.post(
    '/processos/:id/sincronizar',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const processo = await processosRepo.porId(id);
      if (!processo) return reply.status(404).send({ erro: 'Processo não encontrado' });

      const resultado = await sincronizarProcesso(processo);
      const atualizado = await processosRepo.porId(processo.id);

      return reply.status(resultado.sucesso ? 200 : 502).send({
        dado: serializarProcesso(atualizado!),
        resultado,
      });
    },
  );

  app.patch(
    '/processos/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      try {
        const body = patchProcessoBodySchema.parse(request.body);
        const { id } = request.params as { id: string };
        let processo = await processosRepo.porId(id);
        if (!processo) return reply.status(404).send({ erro: 'Processo não encontrado' });

        if (body.ativo !== undefined) {
          processo = (await processosRepo.definirAtivo(processo.id, body.ativo))!;
        }

        return reply.send({ dado: serializarProcesso(processo) });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.delete(
    '/processos/:id',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const removido = await processosRepo.remover(id);
      if (!removido) return reply.status(404).send({ erro: 'Processo não encontrado' });
      return reply.status(204).send();
    },
  );
}
