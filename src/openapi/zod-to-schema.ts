import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Converte um schema Zod em JSON Schema compatível com OpenAPI / Fastify.
 */
export function zodToSchema(schema: ZodTypeAny, name?: string) {
  // Cast evita TS2589 (instanciação excessivamente profunda do zod-to-json-schema)
  const jsonSchema = zodToJsonSchema(schema as any, {
    name,
    $refStrategy: 'none',
    target: 'openApi3',
  }) as Record<string, unknown>;

  const { $schema, ...rest } = jsonSchema;
  return rest;
}
