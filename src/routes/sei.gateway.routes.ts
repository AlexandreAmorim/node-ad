import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { SeiError } from '../lib/sei/errors';
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';
import {
  andamentosLiveQuerySchema,
  blocoProcessosQuerySchema,
  blocoQuerySchema,
  consultarProcessoLiveQuerySchema,
  enviarProcessoBodySchema,
  gerarProcessoBodySchema,
  idBlocoParamsSchema,
  idUnidadeParamsSchema,
  incluirBlocoBodySchema,
} from '../schemas/sei.gateway.schemas';
import { seiGateway } from '../service/seiGateway';
import { processosRepo } from '../service/seiRepository';
import { sincronizarProcesso } from '../service/seiSync';

function zodReply(reply: any, err: ZodError) {
  return reply.status(400).send({
    erro: 'Requisição inválida',
    detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
}

function seiReply(reply: any, err: unknown) {
  if (err instanceof SeiError) {
    const status =
      err.kind === 'nao_encontrado' ? 404 : err.kind === 'acesso_negado' ? 403 : 502;
    return reply.status(status).send({
      erro: err.message,
      tipo: err.kind,
      operacao: err.operacao,
    });
  }
  throw err;
}

/**
 * Rotas live alinhadas ao gateway segov/sei.
 * Prefixo /sei para não colidir com o acompanhamento em /processos.
 */
export async function seiGatewayRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get(
    '/sei/unidades',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Unidades liberadas para a chave de acesso',
        security: [...bearerSecurity],
        response: {
          200: {
            type: 'object',
            properties: {
              dados: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (_request, reply) => {
      try {
        const dados = await seiGateway.listarUnidades();
        return reply.send({ dados });
      } catch (err) {
        return seiReply(reply, err);
      }
    },
  );

  app.get(
    '/sei/unidades/:idUnidade/tipos-processo',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Tipos de processo disponíveis na unidade',
        security: [...bearerSecurity],
        params: zodToSchema(idUnidadeParamsSchema),
        response: {
          200: {
            type: 'object',
            properties: {
              dados: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const { idUnidade } = idUnidadeParamsSchema.parse(request.params);
        const dados = await seiGateway.listarTiposProcedimento(idUnidade);
        return reply.send({ dados });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.get(
    '/sei/processos',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Consulta live de um processo pelo protocolo',
        description:
          'O SeiWS não lista processos. Para listagem use /sei/blocos/:idBloco/processos.',
        security: [...bearerSecurity],
        querystring: zodToSchema(consultarProcessoLiveQuerySchema),
        response: {
          200: {
            type: 'object',
            properties: { dado: { type: 'object', additionalProperties: true } },
          },
          400: { $ref: 'ErrorSei#' },
          401: { $ref: 'ErrorAuth#' },
          404: { $ref: 'ErrorNotFound#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const q = consultarProcessoLiveQuerySchema.parse(request.query);
        const dado = await seiGateway.consultarProcedimento(q.protocolo, {
          idUnidade: q.idUnidade,
          interessados: q.interessados,
          assuntos: q.assuntos,
          observacoes: q.observacoes,
          ultimoAndamento: q.ultimoAndamento,
          unidadesAberto: q.unidadesAberto,
          relacionados: q.relacionados,
          anexados: q.anexados,
        });
        return reply.send({ dado });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.get(
    '/sei/processos/andamentos',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Histórico live de tramitações',
        security: [...bearerSecurity],
        querystring: zodToSchema(andamentosLiveQuerySchema),
        response: {
          200: {
            type: 'object',
            properties: {
              dados: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          400: { $ref: 'ErrorSei#' },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const q = andamentosLiveQuerySchema.parse(request.query);
        const dados = await seiGateway.listarAndamentos(q.protocolo, {
          idUnidade: q.idUnidade,
          atributos: q.atributos,
        });
        return reply.send({ dados });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.post(
    '/sei/processos',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Gera um novo processo no SEI',
        description:
          'Diferente de POST /processos (acompanhar). Com acompanhar=true, cadastra o protocolo gerado na base local.',
        security: [...bearerSecurity],
        body: zodToSchema(gerarProcessoBodySchema),
        response: {
          201: {
            type: 'object',
            properties: {
              dado: { type: 'object', additionalProperties: true },
              acompanhamento: { type: 'object', additionalProperties: true, nullable: true },
            },
          },
          400: { $ref: 'ErrorSei#' },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = gerarProcessoBodySchema.parse(request.body);

        if (body.nivelAcesso !== '0' && !body.idHipoteseLegal) {
          return reply.status(400).send({
            erro: 'idHipoteseLegal é obrigatório para nível de acesso restrito ou sigiloso.',
          });
        }

        const criado = await seiGateway.gerarProcedimento(
          {
            idTipoProcedimento: body.idTipoProcedimento,
            especificacao: body.especificacao,
            nivelAcesso: body.nivelAcesso,
            idHipoteseLegal: body.idHipoteseLegal,
            observacao: body.observacao,
            interessados: body.interessados,
            assuntos: body.assuntos,
          },
          {
            idUnidade: body.idUnidade,
            unidadesEnvio: body.unidadesEnvio,
            manterAbertoNaOrigem: body.manterAbertoNaOrigem,
          },
        );

        let acompanhamento = null;
        if (body.acompanhar) {
          let processo = await processosRepo.criar({
            protocolo: criado.ProcedimentoFormatado,
            rotulo: null,
            observacaoInterna: null,
          });
          await sincronizarProcesso(processo);
          processo = (await processosRepo.porId(processo.id))!;
          acompanhamento = { id: processo.id, protocolo: processo.protocolo };
        }

        return reply.status(201).send({ dado: criado, acompanhamento });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.post(
    '/sei/processos/enviar',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Tramita o processo para outras unidades',
        security: [...bearerSecurity],
        body: zodToSchema(enviarProcessoBodySchema),
        response: {
          200: {
            type: 'object',
            properties: { ok: { type: 'boolean' } },
          },
          400: { $ref: 'ErrorSei#' },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const body = enviarProcessoBodySchema.parse(request.body);
        await seiGateway.enviarProcesso(body.protocolo, body.unidadesDestino, {
          idUnidadeOrigem: body.idUnidadeOrigem,
          manterAbertoNaOrigem: body.manterAbertoNaOrigem,
        });
        return reply.send({ ok: true });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.get(
    '/sei/blocos/:idBloco',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Metadados do bloco e protocolos crus',
        security: [...bearerSecurity],
        params: zodToSchema(idBlocoParamsSchema),
        querystring: zodToSchema(blocoQuerySchema),
        response: {
          200: {
            type: 'object',
            properties: { dado: { type: 'object', additionalProperties: true } },
          },
          401: { $ref: 'ErrorAuth#' },
          404: { $ref: 'ErrorNotFound#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const { idBloco } = idBlocoParamsSchema.parse(request.params);
        const q = blocoQuerySchema.parse(request.query);
        const dado = await seiGateway.consultarBloco(idBloco, q.idUnidade);
        return reply.send({ dado });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.get(
    '/sei/blocos/:idBloco/processos',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Lista processos do bloco já hidratados',
        description:
          'O bloco funciona como índice. Use apenasAbertos=true para o recorte de processos abertos na unidade.',
        security: [...bearerSecurity],
        params: zodToSchema(idBlocoParamsSchema),
        querystring: zodToSchema(blocoProcessosQuerySchema),
        response: {
          200: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              falhas: { type: 'array', items: { type: 'string' } },
              processos: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
          401: { $ref: 'ErrorAuth#' },
          404: { $ref: 'ErrorNotFound#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const { idBloco } = idBlocoParamsSchema.parse(request.params);
        const q = blocoProcessosQuerySchema.parse(request.query);
        const resultado = await seiGateway.listarProcessosDoBloco(idBloco, {
          idUnidade: q.idUnidade,
          apenasAbertos: q.apenasAbertos,
        });
        return reply.send(resultado);
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.post(
    '/sei/blocos/:idBloco/processos',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Inclui um processo no bloco',
        security: [...bearerSecurity],
        params: zodToSchema(idBlocoParamsSchema),
        body: zodToSchema(incluirBlocoBodySchema),
        response: {
          201: {
            type: 'object',
            properties: {
              ok: { type: 'boolean' },
              acompanhamento: { type: 'object', additionalProperties: true, nullable: true },
            },
          },
          400: { $ref: 'ErrorSei#' },
          401: { $ref: 'ErrorAuth#' },
          502: { $ref: 'ErrorSei#' },
        },
      },
    },
    async (request, reply) => {
      try {
        const { idBloco } = idBlocoParamsSchema.parse(request.params);
        const body = incluirBlocoBodySchema.parse(request.body);

        await seiGateway.incluirProcessoBloco(idBloco, body.protocolo, {
          idUnidade: body.idUnidade,
          anotacao: body.anotacao,
        });

        let acompanhamento = null;
        if (body.acompanhar) {
          let processo = await processosRepo.criar({
            protocolo: body.protocolo,
            rotulo: null,
            observacaoInterna: body.anotacao ?? null,
          });
          await sincronizarProcesso(processo);
          processo = (await processosRepo.porId(processo.id))!;
          acompanhamento = { id: processo.id, protocolo: processo.protocolo };
        }

        return reply.status(201).send({ ok: true, acompanhamento });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        return seiReply(reply, err);
      }
    },
  );

  app.delete(
    '/sei/cache',
    {
      preHandler: auth,
      schema: {
        tags: ['SEI Gateway'],
        summary: 'Invalida o cache de unidades e tipos de processo',
        security: [...bearerSecurity],
        response: {
          204: { type: 'null', description: 'Cache invalidado' },
          401: { $ref: 'ErrorAuth#' },
        },
      },
    },
    async (_request, reply) => {
      seiGateway.invalidarCache();
      return reply.status(204).send();
    },
  );
}
