import { z } from 'zod';

export const ativoTipoSchema = z.enum([
  'computador',
  'monitor',
  'impressora',
  'rede',
  'telefone',
  'periferico',
  'software',
  'outro',
]);

export const ativoStatusSchema = z.enum([
  'em_estoque',
  'em_uso',
  'em_manutencao',
  'reservado',
  'descartado',
]);

/** string | null — compatível com OpenAPI3 (type + nullable). */
const strNull = z.string().nullish();
const uuidNull = z.string().uuid().nullish();
const dataOpcional = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Data inválida (YYYY-MM-DD)')
  .nullish();

export const listarAtivosQuerySchema = z.object({
  tipo: ativoTipoSchema.optional(),
  status: ativoStatusSchema.optional(),
  ouCodigo: z.string().optional(),
  usuarioUsername: z.string().optional(),
  busca: z.string().optional(),
  localizacaoId: z.string().uuid().optional(),
  limite: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const criarAtivoBodySchema = z.object({
  nome: z.string().min(2).max(200),
  tipo: ativoTipoSchema.optional(),
  status: ativoStatusSchema.optional(),
  numeroSerie: strNull,
  numeroPatrimonio: strNull,
  numeroInventario: strNull,
  fabricanteId: uuidNull,
  modeloId: uuidNull,
  localizacaoId: uuidNull,
  fornecedorId: uuidNull,
  usuarioUsername: strNull,
  usuarioNome: strNull,
  ouCodigo: strNull,
  dataAquisicao: dataOpcional,
  dataGarantia: dataOpcional,
  valor: z.number().nonnegative().nullish(),
  observacao: strNull,
  specs: z.record(z.string(), z.any()).optional(),
});

export const patchAtivoBodySchema = criarAtivoBodySchema.partial();

export const ativoIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const criarFabricanteBodySchema = z.object({
  nome: z.string().min(1).max(120),
  site: z.string().optional(),
});

export const criarModeloBodySchema = z.object({
  nome: z.string().min(1).max(120),
  tipo: ativoTipoSchema.optional(),
  fabricanteId: z.string().uuid().optional(),
});

export const criarLocalizacaoBodySchema = z.object({
  nome: z.string().min(1).max(120),
  codigo: z.string().max(64).optional(),
  parentId: z.string().uuid().optional(),
  endereco: z.string().max(500).optional(),
});

export const criarFornecedorBodySchema = z.object({
  nome: z.string().min(1).max(120),
  cnpj: z.string().max(18).optional(),
  contato: z.string().max(120).optional(),
  email: z.string().optional(),
  telefone: z.string().max(40).optional(),
});

export const vincularAtivoChamadoBodySchema = z.object({
  ativoId: z.string().uuid(),
});
