import { FastifyInstance } from 'fastify';
import { SipolService } from '../lib/sipol';
import { z } from 'zod'
import { zodToSchema } from '../openapi/zod-to-schema';

const sipolPersonBodySchema = z.object({
  document_user: z.string(),
  document_secondary: z.string().optional(),
  document: z.string().optional(),
  name: z.string().optional(),
  mather: z.string().optional(),
  birthday: z.string().optional(),
})

type SipolPersonBodySchema = z.infer<typeof sipolPersonBodySchema>
 
export async function sipolRoutes(app: FastifyInstance) {
 app.post('/sipol/person', {
    schema: {
      tags: ['Sipol'],
      summary: 'Consultar pessoa no Sipol',
      body: zodToSchema(sipolPersonBodySchema),
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            person: {},
          },
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {

  console.log('request', request.body)

    try {
      const { 
        document_user,
        document_secondary,
        document,
        name,
        mather,
        birthday
      } = request.body as SipolPersonBodySchema;
      
      const person = await SipolService.findSipol({document_user,
        document_secondary,
        document,
        name,
        mather,
        birthday});

        console.log(person)

        return reply.status(200).send({
          success: true,
          person
        });

    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Usuário não encontrado'
      });
    }
  });
}
