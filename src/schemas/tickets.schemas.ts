import { z } from 'zod';

export const chamadoStatusSchema = z.enum([
  'novo',
  'em_atendimento',
  'aguardando_solicitante',
  'resolvido',
  'fechado',
  'cancelado',
]);

export const chamadoPrioridadeSchema = z.enum(['baixa', 'media', 'alta', 'urgente']);

export const listarChamadosQuerySchema = z.object({
  status: chamadoStatusSchema.optional(),
  prioridade: chamadoPrioridadeSchema.optional(),
  escopo: z.enum(['meus', 'secao', 'todos']).default('meus'),
  busca: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

/** Remove tags HTML para validar se há texto real na descrição rich text. */
function textoVisivel(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const descricaoHtmlSchema = z
  .string()
  .max(200_000)
  .refine((v) => textoVisivel(v).length >= 3 || /<img\s/i.test(v), {
    message: 'Descrição deve ter pelo menos 3 caracteres ou uma imagem',
  });

export const criarChamadoBodySchema = z.object({
  titulo: z.string().min(3).max(200),
  descricao: descricaoHtmlSchema,
  prioridade: chamadoPrioridadeSchema.optional(),
  categoriaId: z.string().uuid().optional(),
});

export const patchChamadoBodySchema = z.object({
  status: chamadoStatusSchema.optional(),
  prioridade: chamadoPrioridadeSchema.optional(),
  atendenteUsername: z.string().min(1).max(128).nullable().optional(),
  atendenteNome: z.string().max(200).nullable().optional(),
  categoriaId: z.string().uuid().nullable().optional(),
  titulo: z.string().min(3).max(200).optional(),
  descricao: descricaoHtmlSchema.optional(),
});

export const criarComentarioBodySchema = z.object({
  texto: z.string().min(1).max(10000),
  interno: z.boolean().default(false),
});

export const chamadoIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const criarCategoriaBodySchema = z.object({
  nome: z.string().min(1).max(120),
  descricao: z.string().max(500).optional(),
  parentId: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
});

export const atualizarCategoriaBodySchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  descricao: z.string().max(500).nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  ativo: z.boolean().optional(),
});
