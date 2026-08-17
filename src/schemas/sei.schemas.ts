import { z } from 'zod';
import { protocoloValido } from '../lib/sei/normalize';

export const listarProcessosQuerySchema = z.object({
  ativo: z.enum(['true', 'false']).optional(),
  concluido: z.enum(['true', 'false']).optional(),
  busca: z.string().optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const criarProcessoBodySchema = z.object({
  protocolo: z
    .string()
    .min(5)
    .refine(protocoloValido, 'Número de processo em formato inesperado'),
  rotulo: z.string().max(120).optional(),
  observacaoInterna: z.string().max(2000).optional(),
  sincronizarAgora: z.boolean().default(true),
});

export const patchProcessoBodySchema = z.object({
  ativo: z.boolean().optional(),
  rotulo: z.string().max(120).nullable().optional(),
});
