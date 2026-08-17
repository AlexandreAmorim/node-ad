import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const csv = z
  .string()
  .optional()
  .transform((v) =>
    (v ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('3000'),

  DATABASE_URL: z.string(),

  AD_URL: z.string(),
  AD_BASE_DN: z.string(),
  AD_USERNAME: z.string(),
  AD_PASSWORD: z.string(),

  SIPOL_USER: z.string(),
  SIPOL_PASSWORD: z.string(),
  SIPOL_URL: z.string(),

  DETRAN_URL_SET: z.string(),
  DETRAN_URL_GET: z.string(),
  DETRAN_CNPJ: z.string(),
  DETRAN_KEY: z.string(),
  DETRAN_PROFILE: z.string(),

  JWT_SECRET: z.string(),

  AD_TLS_REJECT_UNAUTHORIZED: z.string().default('true'),
  TSC_COMPILE_ON_ERROR: z.string().default('false'),

  // SEI
  SEI_WSDL_URL: z.string().url().default('https://sei.rj.gov.br/sei/controlador_ws.php?servico=sei'),
  SEI_SIGLA_SISTEMA: z.string().min(1).default('ACOMPANHAMENTO'),
  SEI_CHAVE_ACESSO: z.string().min(1).default('mock'),
  SEI_ID_UNIDADE: z.string().min(1).default('000000000'),
  SEI_ENCODING: z.string().default('ISO-8859-1'),
  SEI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  SEI_TAREFAS_ANDAMENTO: csv,
  SEI_MOCK: bool,

  WORKER_TICK_MS: z.coerce.number().int().positive().default(60_000),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(3),
  WORKER_BATCH_SIZE: z.coerce.number().int().positive().default(50),
});

export const env = envSchema.parse(process.env);
