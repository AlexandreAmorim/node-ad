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
        title: 'Portal SEGOV API',
        description:
          'Portal único: autenticação AD, helpdesk (chamados), SEI multi-seção, consultas Detran/Sipol e fleets SEGOV.',
        version: '2.0.0',
      },
      tags: [
        { name: 'Health', description: 'Health check' },
        { name: 'Auth', description: 'Autenticação e gestão de senhas (AD)' },
        { name: 'Chamados', description: 'Helpdesk / chamados' },
        { name: 'Ativos', description: 'CMDB / inventário de ativos (estilo GLPI)' },
        { name: 'Uploads', description: 'Upload de imagens (máx. 20 MB) para descrição de chamados' },
        { name: 'Seções', description: 'Mapeamento OU AD ↔ unidade SEI' },
        { name: 'SEI', description: 'Acompanhamento de processos SEI (persistido)' },
        {
          name: 'SEI Gateway',
          description:
            'Gateway live sobre o SeiWS (unidades, blocos, gerar/enviar) — alinhado ao segov/sei',
        },
        { name: 'Detran', description: 'Consulta Detran' },
        { name: 'Sipol', description: 'Consulta Sipol' },
        {
          name: 'Segov',
          description:
            'Proxy para o backend SEGOV (auth de serviço + listagem de viaturas/fleets por lotação)',
        },
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
