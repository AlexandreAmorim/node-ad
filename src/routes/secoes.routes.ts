import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';
import {
  atualizarSecaoBodySchema,
  criarSecaoBodySchema,
  secaoIdParamsSchema,
} from '../schemas/secoes.schemas';
import {
  atualizarSecao,
  criarSecao,
  listarSecoes,
  removerSecao,
} from '../service/secoes';

function zodReply(reply: any, err: ZodError) {
  return reply.status(400).send({
    success: false,
    message: 'Requisição inválida',
    detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
}

export async function secoesRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get(
    '/secoes',
    {
      preHandler: auth,
      schema: {
        tags: ['Seções'],
        summary: 'Listar mapeamentos OU AD ↔ SEI',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      const user = request.user as { papeis?: string[] };
      const admin = user.papeis?.includes('admin');
      const dados = await listarSecoes(!admin);
      return reply.send({ dados });
    },
  );

  app.get(
    '/secoes/me',
    {
      preHandler: auth,
      schema: {
        tags: ['Seções'],
        summary: 'Seção resolvida do usuário autenticado',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      const user = request.user as {
        secao?: string | null;
        ouPath?: string;
        seiUnidade?: { idUnidade: string; sigla: string } | null;
        secaoId?: string | null;
        papeis?: string[];
      };
      return reply.send({
        secao: user.secao ?? null,
        ouPath: user.ouPath ?? null,
        seiUnidade: user.seiUnidade ?? null,
        secaoId: user.secaoId ?? null,
        papeis: user.papeis ?? [],
      });
    },
  );

  app.post(
    '/secoes',
    {
      preHandler: [...auth, app.requireAdmin],
      schema: {
        tags: ['Seções'],
        summary: 'Criar mapeamento OU ↔ SEI (admin)',
        security: [...bearerSecurity],
        body: zodToSchema(criarSecaoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const body = criarSecaoBodySchema.parse(request.body);
        const secao = await criarSecao(body);
        return reply.status(201).send({ success: true, secao });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.patch(
    '/secoes/:id',
    {
      preHandler: [...auth, app.requireAdmin],
      schema: {
        tags: ['Seções'],
        summary: 'Atualizar mapeamento OU ↔ SEI (admin)',
        security: [...bearerSecurity],
        body: zodToSchema(atualizarSecaoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const { id } = secaoIdParamsSchema.parse(request.params);
        const body = atualizarSecaoBodySchema.parse(request.body);
        const secao = await atualizarSecao(id, body);
        return reply.send({ success: true, secao });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.delete(
    '/secoes/:id',
    {
      preHandler: [...auth, app.requireAdmin],
      schema: {
        tags: ['Seções'],
        summary: 'Remover mapeamento OU ↔ SEI (admin)',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      try {
        const { id } = secaoIdParamsSchema.parse(request.params);
        await removerSecao(id);
        return reply.send({ success: true, message: 'Seção removida' });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );
}
