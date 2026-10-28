import { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';
import {
  ativoIdParamsSchema,
  criarAtivoBodySchema,
  criarFabricanteBodySchema,
  criarFornecedorBodySchema,
  criarLocalizacaoBodySchema,
  criarModeloBodySchema,
  listarAtivosQuerySchema,
  patchAtivoBodySchema,
} from '../schemas/ativos.schemas';
import { ativosService } from '../service/ativos';
import { usuarioEhAdmin, usuarioEhAtendente } from '../service/secoes';

function zodReply(reply: any, err: ZodError) {
  return reply.status(400).send({
    success: false,
    message: 'Requisição inválida',
    detalhes: err.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
  });
}

function podeGerirAtivos(papeis?: string[]) {
  return usuarioEhAtendente(papeis) || usuarioEhAdmin(papeis);
}

/** Admin vê todos; demais usuários só os atribuídos a si (usuarioUsername). */
function escopoUsuario(user: { username: string; papeis?: string[] }) {
  const ehAdmin = usuarioEhAdmin(user.papeis);
  return {
    ehAdmin,
    usuarioUsername: ehAdmin ? undefined : user.username,
  };
}

export async function ativosRoutes(app: FastifyInstance) {
  const auth = [app.authenticate];

  app.get(
    '/ativos/resumo',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Resumo do inventário (KPIs)',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      const user = request.user as { username: string; papeis?: string[] };
      const { usuarioUsername } = escopoUsuario(user);
      const resumo = await ativosService.resumo({ usuarioUsername });
      return reply.send(resumo);
    },
  );

  app.get(
    '/ativos',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Listar ativos (admin: todos; usuário: apenas os seus)',
        security: [...bearerSecurity],
        querystring: zodToSchema(listarAtivosQuerySchema),
      },
    },
    async (request, reply) => {
      try {
        const q = listarAtivosQuerySchema.parse(request.query);
        const user = request.user as { username: string; papeis?: string[] };
        const { ehAdmin, usuarioUsername } = escopoUsuario(user);

        // Não-admin: ignora filtro de usuário da query e força o próprio username.
        const lista = await ativosService.listar({
          ...q,
          usuarioUsername: ehAdmin
            ? q.usuarioUsername || undefined
            : usuarioUsername,
        });
        return reply.send({
          dados: lista.map((a) => ativosService.serializarAtivo(a)),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.post(
    '/ativos',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Cadastrar ativo',
        security: [...bearerSecurity],
        body: zodToSchema(criarAtivoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { username: string; papeis?: string[]; secao?: string | null };
        if (!usuarioEhAdmin(user.papeis)) {
          return reply.status(403).send({
            success: false,
            message: 'Apenas administradores podem cadastrar ativos',
          });
        }
        const body = criarAtivoBodySchema.parse(request.body);
        const ativo = await ativosService.criar(
          {
            ...body,
            ouCodigo: body.ouCodigo ?? user.secao ?? null,
          },
          user.username,
        );
        return reply.status(201).send({
          success: true,
          ativo: ativosService.serializarAtivo(ativo),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.get(
    '/ativos/:id',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Detalhe do ativo',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      try {
        const { id } = ativoIdParamsSchema.parse(request.params);
        const user = request.user as { username: string; papeis?: string[] };
        const { ehAdmin } = escopoUsuario(user);
        const ativo = await ativosService.obter(id);
        if (
          !ativo ||
          !ativosService.podeVerAtivo(ativo, { username: user.username, ehAdmin })
        ) {
          return reply.status(404).send({ success: false, message: 'Ativo não encontrado' });
        }
        return reply.send({
          success: true,
          ativo: {
            ...ativosService.serializarAtivo(ativo),
            historico: ativo.historico,
            chamados: ativo.chamados.map((c) => c.chamado),
          },
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.patch(
    '/ativos/:id',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Atualizar ativo',
        security: [...bearerSecurity],
        body: zodToSchema(patchAtivoBodySchema),
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { username: string; papeis?: string[] };
        if (!podeGerirAtivos(user.papeis)) {
          return reply.status(403).send({ success: false, message: 'Sem permissão' });
        }
        const { id } = ativoIdParamsSchema.parse(request.params);
        const { ehAdmin } = escopoUsuario(user);
        const atual = await ativosService.obter(id);
        if (
          !atual ||
          !ativosService.podeVerAtivo(atual, { username: user.username, ehAdmin })
        ) {
          return reply.status(404).send({ success: false, message: 'Ativo não encontrado' });
        }
        // Só admin altera ativos de outros usuários / inventário geral
        if (!ehAdmin) {
          return reply.status(403).send({
            success: false,
            message: 'Apenas administradores podem alterar o inventário',
          });
        }
        const body = patchAtivoBodySchema.parse(request.body);
        const ativo = await ativosService.atualizar(id, body, user.username);
        return reply.send({
          success: true,
          ativo: ativosService.serializarAtivo(ativo),
        });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  app.delete(
    '/ativos/:id',
    {
      preHandler: auth,
      schema: {
        tags: ['Ativos'],
        summary: 'Remover ativo',
        security: [...bearerSecurity],
      },
    },
    async (request, reply) => {
      try {
        const user = request.user as { papeis?: string[] };
        if (!usuarioEhAdmin(user.papeis)) {
          return reply.status(403).send({ success: false, message: 'Apenas admin' });
        }
        const { id } = ativoIdParamsSchema.parse(request.params);
        await ativosService.remover(id);
        return reply.send({ success: true, message: 'Ativo removido' });
      } catch (err) {
        if (err instanceof ZodError) return zodReply(reply, err);
        throw err;
      }
    },
  );

  // --- Catálogos auxiliares ---

  app.get('/fabricantes', { preHandler: auth, schema: { tags: ['Ativos'], security: [...bearerSecurity] } },
    async (_req, reply) => reply.send({ dados: await ativosService.listarFabricantes() }));

  app.post('/fabricantes', {
    preHandler: auth,
    schema: { tags: ['Ativos'], security: [...bearerSecurity], body: zodToSchema(criarFabricanteBodySchema) },
  }, async (request, reply) => {
    const user = request.user as { papeis?: string[] };
    if (!podeGerirAtivos(user.papeis)) {
      return reply.status(403).send({ success: false, message: 'Sem permissão' });
    }
    try {
      const body = criarFabricanteBodySchema.parse(request.body);
      const fabricante = await ativosService.criarFabricante(body);
      return reply.status(201).send({ success: true, fabricante });
    } catch (err) {
      if (err instanceof ZodError) return zodReply(reply, err);
      throw err;
    }
  });

  app.get('/modelos-ativo', { preHandler: auth, schema: { tags: ['Ativos'], security: [...bearerSecurity] } },
    async (request, reply) => {
      const tipo = (request.query as { tipo?: string }).tipo as any;
      return reply.send({ dados: await ativosService.listarModelos(tipo) });
    });

  app.post('/modelos-ativo', {
    preHandler: auth,
    schema: { tags: ['Ativos'], security: [...bearerSecurity], body: zodToSchema(criarModeloBodySchema) },
  }, async (request, reply) => {
    const user = request.user as { papeis?: string[] };
    if (!podeGerirAtivos(user.papeis)) {
      return reply.status(403).send({ success: false, message: 'Sem permissão' });
    }
    try {
      const body = criarModeloBodySchema.parse(request.body);
      const modelo = await ativosService.criarModelo(body);
      return reply.status(201).send({ success: true, modelo });
    } catch (err) {
      if (err instanceof ZodError) return zodReply(reply, err);
      throw err;
    }
  });

  app.get('/localizacoes', { preHandler: auth, schema: { tags: ['Ativos'], security: [...bearerSecurity] } },
    async (_req, reply) => reply.send({ dados: await ativosService.listarLocalizacoes() }));

  app.post('/localizacoes', {
    preHandler: auth,
    schema: { tags: ['Ativos'], security: [...bearerSecurity], body: zodToSchema(criarLocalizacaoBodySchema) },
  }, async (request, reply) => {
    const user = request.user as { papeis?: string[] };
    if (!podeGerirAtivos(user.papeis)) {
      return reply.status(403).send({ success: false, message: 'Sem permissão' });
    }
    try {
      const body = criarLocalizacaoBodySchema.parse(request.body);
      const localizacao = await ativosService.criarLocalizacao(body);
      return reply.status(201).send({ success: true, localizacao });
    } catch (err) {
      if (err instanceof ZodError) return zodReply(reply, err);
      throw err;
    }
  });

  app.get('/fornecedores', { preHandler: auth, schema: { tags: ['Ativos'], security: [...bearerSecurity] } },
    async (_req, reply) => reply.send({ dados: await ativosService.listarFornecedores() }));

  app.post('/fornecedores', {
    preHandler: auth,
    schema: { tags: ['Ativos'], security: [...bearerSecurity], body: zodToSchema(criarFornecedorBodySchema) },
  }, async (request, reply) => {
    const user = request.user as { papeis?: string[] };
    if (!podeGerirAtivos(user.papeis)) {
      return reply.status(403).send({ success: false, message: 'Sem permissão' });
    }
    try {
      const body = criarFornecedorBodySchema.parse(request.body);
      const fornecedor = await ativosService.criarFornecedor(body);
      return reply.status(201).send({ success: true, fornecedor });
    } catch (err) {
      if (err instanceof ZodError) return zodReply(reply, err);
      throw err;
    }
  });
}
