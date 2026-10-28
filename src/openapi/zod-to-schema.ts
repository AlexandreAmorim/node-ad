import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * AJV (Fastify) rejeita `{ nullable: true }` sem `type`.
 * OpenAPI3 exige type + nullable juntos; unions/nullish às vezes saem quebrados.
 */
function sanitizarNullable(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(sanitizarNullable);
  }
  if (!node || typeof node !== 'object') return node;

  const obj = node as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(obj)) {
    out[k] = sanitizarNullable(v);
  }

  if (out.nullable === true && out.type === undefined) {
    if (Array.isArray(out.anyOf) || Array.isArray(out.oneOf) || Array.isArray(out.allOf)) {
      // Mantém a união e remove nullable órfão
      delete out.nullable;
    } else {
      out.type = 'string';
    }
  }

  // z.record / additionalProperties: true sem type em objetos
  if (out.type === undefined && out.additionalProperties !== undefined && !out.anyOf && !out.oneOf) {
    out.type = 'object';
  }

  return out;
}

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
  return sanitizarNullable(rest) as Record<string, unknown>;
}
