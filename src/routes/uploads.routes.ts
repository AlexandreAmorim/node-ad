import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { randomUUID } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { bearerSecurity } from '../openapi/components';

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const MIME_PERMITIDOS = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/bmp': '.bmp',
};

export const UPLOADS_DIR = join(process.cwd(), 'uploads', 'chamados');

export async function uploadsRoutes(app: FastifyInstance) {
  await mkdir(UPLOADS_DIR, { recursive: true });

  app.post(
    '/uploads/imagens',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Uploads'],
        summary: 'Upload de imagem para descrição de chamado (máx. 20 MB)',
        security: [...bearerSecurity],
        consumes: ['multipart/form-data'],
      },
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({
          success: false,
          message: 'Nenhum arquivo enviado (campo "file")',
        });
      }

      const mime = (file.mimetype || '').toLowerCase();
      if (!MIME_PERMITIDOS.has(mime)) {
        await file.toBuffer(); // consome o stream
        return reply.status(400).send({
          success: false,
          message: 'Tipo de arquivo não permitido. Use JPEG, PNG, GIF, WebP ou BMP.',
        });
      }

      const ext =
        EXT_POR_MIME[mime] ??
        (extname(file.filename || '').toLowerCase() || '.bin');
      const nome = `${randomUUID()}${ext}`;
      const destino = join(UPLOADS_DIR, nome);

      let bytes = 0;
      file.file.on('data', (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_BYTES) {
          file.file.destroy(new Error('Arquivo excede 20 MB'));
        }
      });

      try {
        await pipeline(file.file, createWriteStream(destino));
      } catch (err: any) {
        return reply.status(413).send({
          success: false,
          message: err?.message?.includes('20 MB')
            ? 'Arquivo excede o limite de 20 MB'
            : 'Falha ao salvar o arquivo',
        });
      }

      if (bytes > MAX_BYTES) {
        return reply.status(413).send({
          success: false,
          message: 'Arquivo excede o limite de 20 MB',
        });
      }

      const url = `/uploads/chamados/${nome}`;
      return reply.status(201).send({
        success: true,
        url,
        nome,
        tamanho: bytes,
        mime,
      });
    },
  );
}
