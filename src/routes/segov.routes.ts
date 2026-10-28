import { FastifyInstance } from 'fastify';
import { SegovService } from '../lib/segov';
import { z } from 'zod'
import { bearerSecurity } from '../openapi/components';
import { zodToSchema } from '../openapi/zod-to-schema';

const fleetBodySchema = z.object({
  management: z.coerce
    .number()
    .int()
    .min(1)
    .describe('ID da lotação (management) no backend SEGOV'),
  document_user: z
    .string()
    .min(1)
    .describe('CPF do usuário consultante (header cpf-usuario no gateway)'),
})

type FleetBodySchema = z.infer<typeof fleetBodySchema>

const fleetItemSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    id: { type: 'string', description: 'UUID da viatura' },
    plate: { type: 'string', description: 'Placa' },
    specialPlate: {
      type: 'string',
      nullable: true,
      description: 'Placa especial / operacional',
    },
    managementId: {
      type: 'integer',
      nullable: true,
      description: 'ID da lotação vinculada',
    },
    statusVehicle: {
      type: 'boolean',
      description: 'Situação operacional da viatura',
    },
    makeCar: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    modelCar: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    },
    management: {
      type: 'object',
      nullable: true,
      additionalProperties: true,
      properties: {
        id: { type: 'integer' },
        initials: { type: 'string' },
        name: { type: 'string' },
      },
    },
  },
}

const fleetsPayloadSchema = {
  type: 'object',
  additionalProperties: true,
  properties: {
    data: {
      type: 'array',
      description: 'Lista de viaturas retornada pelo backend SEGOV',
      items: fleetItemSchema,
    },
    totalCount: {
      type: 'integer',
      description: 'Total de registros (considera paginação do backend)',
    },
  },
}

export async function segovRoutes(app: FastifyInstance) {
  app.post('/segov/fleets', {
    preHandler: [app.authenticate],
    schema: {
      tags: ['Segov'],
      summary: 'Listar viaturas por lotação',
      description:
        'Proxy autenticado para o backend SEGOV (`GET /fleets`). ' +
        'O node-ad autentica com `SEGOV_USER`/`SEGOV_PASSWORD` (`POST /auth/login`), ' +
        'cacheia o JWT em `settings.segov_token` e consulta as viaturas filtradas por `managementId`.',
      security: [...bearerSecurity],
      body: zodToSchema(fleetBodySchema),
      response: {
        200: {
          description: 'Lista de viaturas retornada pelo backend SEGOV',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            fleets: fleetsPayloadSchema,
          },
          required: ['success', 'fleets'],
        },
        401: { $ref: 'ErrorAuth#' },
        404: {
          description: 'Falha inesperada na consulta',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
          required: ['success', 'message'],
        },
        502: {
          description:
            'Gateway SEGOV indisponível, status desligado (segov_status) ou autenticação de serviço falhou',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
          required: ['success', 'message'],
        },
      },
    },
  }, async (request, reply) => {
    try {
      const {
        management,
        document_user,
      } = request.body as FleetBodySchema;

      const fleets = await SegovService.findSegovFleets({
        management,
        document_user,
      });

      if (fleets === false || fleets == null) {
        return reply.status(502).send({
          success: false,
          message: 'Gateway SEGOV indisponível ou autenticação falhou',
        });
      }

      return reply.status(200).send({
        success: true,
        fleets,
      });
    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Viaturas não encontradas',
      });
    }
  });
}
