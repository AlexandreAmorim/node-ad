import { z } from 'zod';
import { protocoloValido } from '../lib/sei/normalize';

/** Preferência do gateway sei: protocolo só em query/body (barra no path quebra). */
export const protocoloQuerySchema = z
  .string()
  .min(5)
  .refine(protocoloValido, 'Número de processo em formato inesperado');

export const idUnidadeSchema = z.string().regex(/^\d+$/, 'IdUnidade deve ser numérico');

export const idBlocoParamsSchema = z.object({
  idBloco: z.string().regex(/^\d+$/, 'IdBloco deve ser numérico'),
});

export const idUnidadeParamsSchema = z.object({
  idUnidade: idUnidadeSchema,
});

const boolQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .optional()
  .transform((v) => {
    if (v === undefined) return undefined;
    if (typeof v === 'boolean') return v;
    return v === 'true' || v === '1';
  });

export const consultarProcessoLiveQuerySchema = z.object({
  protocolo: protocoloQuerySchema,
  idUnidade: idUnidadeSchema.optional(),
  interessados: boolQuery,
  assuntos: boolQuery,
  observacoes: boolQuery,
  ultimoAndamento: boolQuery,
  unidadesAberto: boolQuery,
  relacionados: boolQuery,
  anexados: boolQuery,
});

export const andamentosLiveQuerySchema = z.object({
  protocolo: protocoloQuerySchema,
  idUnidade: idUnidadeSchema.optional(),
  atributos: boolQuery,
});

export const gerarProcessoBodySchema = z.object({
  idUnidade: idUnidadeSchema.optional(),
  idTipoProcedimento: z.string().min(1),
  especificacao: z.string().min(1).max(255),
  nivelAcesso: z.enum(['0', '1', '2']).default('0'),
  idHipoteseLegal: z.string().optional(),
  observacao: z.string().optional(),
  interessados: z
    .array(
      z.object({
        nome: z.string().min(1),
        sigla: z.string().optional(),
        cpf: z.string().regex(/^\d{11}$/).optional(),
      }),
    )
    .optional(),
  assuntos: z
    .array(
      z.object({
        codigoEstruturado: z.string().min(1),
        descricao: z.string().optional(),
      }),
    )
    .optional(),
  unidadesEnvio: z.array(idUnidadeSchema).default([]),
  manterAbertoNaOrigem: z.boolean().default(true),
  /** Se true, cadastra o processo gerado no acompanhamento local. */
  acompanhar: z.boolean().default(false),
});

export const enviarProcessoBodySchema = z.object({
  protocolo: protocoloQuerySchema,
  idUnidadeOrigem: idUnidadeSchema.optional(),
  unidadesDestino: z.array(idUnidadeSchema).min(1),
  manterAbertoNaOrigem: z.boolean().default(false),
});

export const blocoQuerySchema = z.object({
  idUnidade: idUnidadeSchema.optional(),
});

export const blocoProcessosQuerySchema = z.object({
  idUnidade: idUnidadeSchema.optional(),
  apenasAbertos: boolQuery,
});

export const incluirBlocoBodySchema = z.object({
  protocolo: protocoloQuerySchema,
  idUnidade: idUnidadeSchema.optional(),
  anotacao: z.string().max(1000).optional(),
  /** Se true, cadastra o protocolo no acompanhamento local. */
  acompanhar: z.boolean().default(false),
});
