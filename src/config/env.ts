import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  PORT: z.string().default('3000'),
  
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
});

export const env = envSchema.parse(process.env);