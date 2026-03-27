import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Carrega o .env da raiz do projeto, independente de onde o script é executado
dotenv.config({ path: resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('3000'),

  DATABASE_URL: z.string(),
  
  // AD Configuration
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
  
  // JWT Configuration
  JWT_SECRET: z.string(),
  
  // Optional: LDAPS Configuration
  AD_TLS_REJECT_UNAUTHORIZED: z.string().default('true'),
  TSC_COMPILE_ON_ERROR: z.string().default('false'),
});

export const env = envSchema.parse(process.env);