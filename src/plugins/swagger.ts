import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import type { FastifyInstance } from 'fastify';
import {
  andamentoSchema,
  authUserDetailSchema,
  authUserSchema,
  errorAuthSchema,
  errorNotFoundSchema,
  errorSeiSchema,
  eventoSchema,
  processoSchema,
} from '../openapi/components';

export async function registerSwagger(app: FastifyInstance) {
  app.addSchema({ $id: 'ErrorAuth', ...errorAuthSchema });
  app.addSchema({ $id: 'ErrorSei', ...errorSeiSchema });
  app.addSchema({ $id: 'ErrorNotFound', ...errorNotFoundSchema });
  app.addSchema({ $id: 'AuthUser', ...authUserSchema });
  app.addSchema({ $id: 'AuthUserDetail', ...authUserDetailSchema });
  app.addSchema({ $id: 'Processo', ...processoSchema });
  app.addSchema({ $id: 'Andamento', ...andamentoSchema });
  app.addSchema({ $id: 'Evento', ...eventoSchema });

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'AD Password / SEI API',
        description:
          'API de autenticação Active Directory, consulta Detran/Sipol e acompanhamento de processos SEI.',
        version: '1.0.0',
      },
      tags: [
        { name: 'Health', description: 'Health check' },
        { name: 'Auth', description: 'Autenticação e gestão de senhas (AD)' },
        { name: 'SEI', description: 'Acompanhamento de processos SEI (persistido)' },
        {
          name: 'SEI Gateway',
          description:
            'Gateway live sobre o SeiWS (unidades, blocos, gerar/enviar) — alinhado ao segov/sei',
        },
        { name: 'Detran', description: 'Consulta Detran' },
        { name: 'Sipol', description: 'Consulta Sipol' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido em POST /auth/login',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
  });
}
