import { env } from '../../config/env';
import { SeiSoapClient } from './client';
import { SeiMockClient } from './mock';
import type { SeiClient } from './types';

let instancia: SeiClient | null = null;

/** Client compartilhado — respeita SEI_MOCK do .env. */
export function getSeiClient(): SeiClient {
  instancia ??= env.SEI_MOCK ? new SeiMockClient() : new SeiSoapClient();
  return instancia;
}

export function setSeiClient(client: SeiClient | null): void {
  instancia = client;
}

export * from './types';
export * from './errors';
export * from './normalize';
export { SeiSoapClient } from './client';
export { SeiMockClient } from './mock';
