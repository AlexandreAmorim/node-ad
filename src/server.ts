import { mkdirSync } from 'node:fs';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';
import { env } from './config/env';
import { registerSwagger } from './plugins/swagger';
import { authRoutes } from './routes/auth.routes';
import { detranRoutes } from './routes/detran.routes';
import { secoesRoutes } from './routes/secoes.routes';
import { seiGatewayRoutes } from './routes/sei.gateway.routes';
import { seiRoutes } from './routes/sei.routes';
import { sipolRoutes } from './routes/sipol.routes';
import { ticketsRoutes } from './routes/tickets.routes';
import { ativosRoutes } from './routes/ativos.routes';
import { UPLOADS_DIR, uploadsRoutes } from './routes/uploads.routes';
import { usuarioEhAdmin } from './service/secoes';
import { segovRoutes } from './routes/segov.routes';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: any;
    requireAdmin: any;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      username: string;
      dn?: string;
      displayName?: string;
      mail?: string;
      memberOf?: string | string[];
      secao?: string | null;
      secaoId?: string | null;
      ouPath?: string;
      seiUnidade?: { idUnidade: string; sigla: string } | null;
      papeis?: string[];
    };
    user: {
      username: string;
      dn?: string;
      displayName?: string;
      mail?: string;
      memberOf?: string | string[];
      secao?: string | null;
      secaoId?: string | null;
      ouPath?: string;
      seiUnidade?: { idUnidade: string; sigla: string } | null;
      papeis?: string[];
    };
  }
}

async function buildServer() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development',
    bodyLimit: 21 * 1024 * 1024, // margem além dos 20 MB de imagem
    ajv: {
      customOptions: {
        coerceTypes: true,
      },
    },
  });

  await app.register(cors, {
    origin: [env.CORS_ORIGIN],
    credentials: true,
    // @fastify/cors v11 defaulta só GET,HEAD,POST — PATCH é usado em chamados/seções
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024,
      files: 1,
    },
  });

  mkdirSync(UPLOADS_DIR, { recursive: true });
  await app.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/chamados/',
    decorateReply: false,
  });

  await registerSwagger(app);

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({
        success: false,
        message: 'Token inválido ou expirado!',
      });
    }
  });

  app.decorate('requireAdmin', async (request: any, reply: any) => {
    const user = request.user;
    const grupos = Array.isArray(user?.memberOf)
      ? user.memberOf
      : typeof user?.memberOf === 'string'
        ? [user.memberOf]
        : [];
    const adminPorGrupo = grupos.some((g: string) =>
      /CN=Domain Admins/i.test(g),
    );
    if (!user || (!usuarioEhAdmin(user.papeis) && !adminPorGrupo)) {
      return reply.status(403).send({
        success: false,
        message: 'Permissão administrativa necessária',
      });
    }
  });

  app.get(
    '/health',
    {
      schema: {
        tags: ['Health'],
        summary: 'Health check',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              timestamp: { type: 'string', format: 'date-time' },
              seiMock: { type: 'boolean' },
            },
            required: ['status', 'timestamp', 'seiMock'],
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      seiMock: env.SEI_MOCK,
    }),
  );

  await app.register(authRoutes);
  await app.register(sipolRoutes);
  await app.register(detranRoutes);
  await app.register(segovRoutes);
  await app.register(seiRoutes);
  await app.register(seiGatewayRoutes);
  await app.register(ticketsRoutes);
  await app.register(ativosRoutes);
  await app.register(secoesRoutes);
  await app.register(uploadsRoutes);

  return app;
}

async function start() {
  try {
    const app = await buildServer();

    await app.listen({
      port: parseInt(env.PORT),
      host: '0.0.0.0',
    });

    console.log(`🚀 Server running on port ${env.PORT}`);
    console.log(`📚 Swagger UI: http://localhost:${env.PORT}/docs`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

start();
