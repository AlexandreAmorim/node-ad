import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';
import { vincularAtivoChamadoBodySchema } from '../schemas/ativos.schemas';
import {
  atualizarCategoriaBodySchema,
  chamadoIdParamsSchema,
  criarCategoriaBodySchema,
  criarChamadoBodySchema,
  criarComentarioBodySchema,
  listarChamadosQuerySchema,
  patchChamadoBodySchema,
} from '../schemas/tickets.schemas';
import { ativosService } from '../service/ativos';
import { usuarioEhAdmin, usuarioEhAtendente } from '../service/secoes';
import { podeEditarChamado, ticketsService } from '../service/tickets';

function zodReply(reply: any, err: ZodError) {
  return reply.status(400).send({
    success: false,
    message: 'Requisição inválida',
    detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
}

export async function ticketsRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get(
    '/categorias',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Listar categorias de chamado',
        security: [...bearerSecurity],
      },
    },
    async (_request, reply) => {
      const dados = await ticketsService.listarCategorias();
      return reply.send({ dados });
    },
  );

  app.post(
    '/categorias',
    {
      preHandler: [...auth, app.requireAdmin],
      schema: {
        tags: ['Chamados'],
        summary: 'Criar categoria (admin)',
        security: [...bearerSecurity],
        body: zodToSchema(criarCategoriaBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const body = criarCategoriaBodySchema.parse(request.body);
        const categoria = await ticketsService.criarCategoria(body);
        return reply.status(201).send({ success: true, categoria });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.patch(
    '/categorias/:id',
    {
      preHandler: [...auth, app.requireAdmin],
      schema: {
        tags: ['Chamados'],
        summary: 'Atualizar categoria (admin)',
        security: [...bearerSecurity],
        body: zodToSchema(atualizarCategoriaBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const body = atualizarCategoriaBodySchema.parse(request.body);
        const categoria = await ticketsService.atualizarCategoria(id, body);
        return reply.send({ success: true, categoria });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.get(
    '/chamados',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Listar chamados',
        security: [...bearerSecurity],
        querystring: zodToSchema(listarChamadosQuerySchema),
      },
    },
    async (request, reply) => {
      try {
        const q = listarChamadosQuerySchema.parse(request.query);
        const user = request.user as {
          username: string;
          papeis?: string[];
          secao?: string | null;
        };
        const lista = await ticketsService.listar({
          username: user.username,
          papeis: user.papeis,
          secao: user.secao,
          status: q.status,
          prioridade: q.prioridade,
          escopo: q.escopo,
          busca: q.busca,
          limite: q.limite,
          offset: q.offset,
        });
        return reply.send({
          dados: lista.map((c) => ticketsService.serializarChamado(c)),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.post(
    '/chamados',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Abrir chamado',
        security: [...bearerSecurity],
        body: zodToSchema(criarChamadoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const body = criarChamadoBodySchema.parse(request.body);
        const user = request.user as {
          username: string;
          displayName?: string;
          secao?: string | null;
          secaoId?: string | null;
        };
        const chamado = await ticketsService.criar({
          ...body,
          username: user.username,
          displayName: user.displayName,
          secaoId: user.secaoId,
          ouCodigo: user.secao,
        });
        return reply.status(201).send({
          success: true,
          chamado: ticketsService.serializarChamado(chamado),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.get(
    '/chamados/:id',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Detalhe do chamado',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const user = request.user as {
          username: string;
          papeis?: string[];
          secao?: string | null;
        };
        const chamado = await ticketsService.obter(id, {
          username: user.username,
          papeis: user.papeis,
          secao: user.secao,
        });
        if (!chamado) {
          return reply.status(404).send({
            success: false,
            message: 'Chamado não encontrado',
          });
        }
        return reply.send({
          success: true,
          chamado: ticketsService.serializarChamado(chamado),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.patch(
    '/chamados/:id',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Atualizar chamado (status, prioridade, atendente)',
        security: [...bearerSecurity],
        body: zodToSchema(patchChamadoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const body = patchChamadoBodySchema.parse(request.body);
        const user = request.user as {
          username: string;
          displayName?: string;
          papeis?: string[];
          secao?: string | null;
        };

        const atual = await ticketsService.obter(id, {
          username: user.username,
          papeis: user.papeis,
          secao: user.secao,
        });
        if (!atual) {
          return reply.status(404).send({
            success: false,
            message: 'Chamado não encontrado',
          });
        }
        if (!podeEditarChamado(atual, user)) {
          return reply.status(403).send({
            success: false,
            message: 'Sem permissão para editar este chamado',
          });
        }

        // Solicitante não muda atendente/status avançados
        const patch = { ...body };
        if (!usuarioEhAtendente(user.papeis) && !usuarioEhAdmin(user.papeis)) {
          delete patch.atendenteUsername;
          delete patch.atendenteNome;
          if (patch.status && !['novo', 'aguardando_solicitante', 'cancelado'].includes(patch.status)) {
            return reply.status(403).send({
              success: false,
              message: 'Solicitante não pode definir este status',
            });
          }
        }

        if (patch.status === 'em_atendimento' && !patch.atendenteUsername) {
          patch.atendenteUsername = user.username;
          patch.atendenteNome = user.displayName ?? null;
        }

        const chamado = await ticketsService.atualizar(id, patch, user.username);
        return reply.send({
          success: true,
          chamado: ticketsService.serializarChamado(chamado),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.post(
    '/chamados/:id/comentarios',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Comentar em chamado',
        security: [...bearerSecurity],
        body: zodToSchema(criarComentarioBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const body = criarComentarioBodySchema.parse(request.body);
        const user = request.user as {
          username: string;
          displayName?: string;
          papeis?: string[];
          secao?: string | null;
        };

        const chamado = await ticketsService.obter(id, {
          username: user.username,
          papeis: user.papeis,
          secao: user.secao,
        });
        if (!chamado) {
          return reply.status(404).send({
            success: false,
            message: 'Chamado não encontrado',
          });
        }

        const interno =
          body.interno &&
          (usuarioEhAtendente(user.papeis) || usuarioEhAdmin(user.papeis));

        const comentario = await ticketsService.comentar({
          chamadoId: id,
          username: user.username,
          displayName: user.displayName,
          texto: body.texto,
          interno: Boolean(interno),
        });

        return reply.status(201).send({ success: true, comentario });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.post(
    '/chamados/:id/ativos',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Vincular ativo ao chamado',
        security: [...bearerSecurity],
        body: zodToSchema(vincularAtivoChamadoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const body = vincularAtivoChamadoBodySchema.parse(request.body);
        const user = request.user as {
          username: string;
          papeis?: string[];
          secao?: string | null;
        };
        const chamado = await ticketsService.obter(id, user);
        if (!chamado) {
          return reply.status(404).send({ success: false, message: 'Chamado não encontrado' });
        }
        if (!podeEditarChamado(chamado, user) && !usuarioEhAtendente(user.papeis)) {
          return reply.status(403).send({ success: false, message: 'Sem permissão' });
        }
        await ativosService.vincularChamado(id, body.ativoId);
        const atualizado = await ticketsService.obter(id, user);
        return reply.status(201).send({
          success: true,
          chamado: ticketsService.serializarChamado(atualizado!),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.delete(
    '/chamados/:id/ativos/:ativoId',
    {
      preHandler: auth,
      schema: {
        tags: ['Chamados'],
        summary: 'Desvincular ativo do chamado',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      try {
        const { id } = chamadoIdParamsSchema.parse(request.params);
        const ativoId = (request.params as { ativoId: string }).ativoId;
        const user = request.user as {
          username: string;
          papeis?: string[];
          secao?: string | null;
        };
        const chamado = await ticketsService.obter(id, user);
        if (!chamado) {
          return reply.status(404).send({ success: false, message: 'Chamado não encontrado' });
        }
        await ativosService.desvincularChamado(id, ativoId);
        const atualizado = await ticketsService.obter(id, user);
        return reply.send({
          success: true,
          chamado: ticketsService.serializarChamado(atualizado!),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );
}
