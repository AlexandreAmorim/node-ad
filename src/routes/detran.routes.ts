import { FastifyInstance } from 'fastify';
import { DetranService } from '../lib/detran';
import { z } from 'zod'
import { XMLParser } from 'fast-xml-parser';

const detranPersonBodySchema = z.object({
  document_user: z.string(),
  document_secondary: z.string().optional(),
  document: z.string().optional(),
  name: z.string().optional(),
  mather: z.string().optional(),
  birthday: z.string().optional(),
})

type DetranPersonBodySchema = z.infer<typeof detranPersonBodySchema>
 
export async function detranRoutes(app: FastifyInstance) {
 app.post('/detran/person', async (request, reply) => {

    try {
      const { 
        document_user,
        document_secondary,
        document,
        name,
        mather,
        birthday
      } = request.body as DetranPersonBodySchema;
      
      const detran = await DetranService.findDetran({document_user,
        document_secondary,
        document,
        name,
        mather,
        birthday,});

        const parser = new XMLParser();
        const dataaa = await parser.parse(detran.data, {});

        const dados = dataaa['soap:Envelope']
        ['soap:Body']
        .BuscarProcessadosResponse
        .BuscarProcessadosResult
        .dadosCivil;

        return reply.status(200).send({
          success: true,
          dados
        });

    } catch (error: any) {
      return reply.status(404).send({
        success: false,
        message: error.message || 'Usuário não encontrado'
      });
    }
  });
}