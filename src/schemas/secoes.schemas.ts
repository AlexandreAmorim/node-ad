import { z } from 'zod';

export const criarSecaoBodySchema = z.object({
  ouCodigo: z.string().min(1).max(64),
  nome: z.string().min(1).max(120),
  seiIdUnidade: z.string().max(32).nullable().optional(),
  seiSigla: z.string().max(64).nullable().optional(),
  ativo: z.boolean().optional(),
});

export const atualizarSecaoBodySchema = z.object({
  ouCodigo: z.string().min(1).max(64).optional(),
  nome: z.string().min(1).max(120).optional(),
  seiIdUnidade: z.string().max(32).nullable().optional(),
  seiSigla: z.string().max(64).nullable().optional(),
  ativo: z.boolean().optional(),
});

export const secaoIdParamsSchema = z.object({
  id: z.string().uuid(),
});
