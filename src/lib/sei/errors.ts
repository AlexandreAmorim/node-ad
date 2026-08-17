export type SeiErrorKind =
  | 'acesso_negado'
  | 'nao_encontrado'
  | 'sigiloso'
  | 'timeout'
  | 'indisponivel'
  | 'desconhecido';

export class SeiError extends Error {
  readonly kind: SeiErrorKind;
  readonly operacao: string;
  readonly cause?: unknown;

  constructor(operacao: string, message: string, kind: SeiErrorKind, cause?: unknown) {
    super(`[${operacao}] ${message}`);
    this.name = 'SeiError';
    this.operacao = operacao;
    this.kind = kind;
    this.cause = cause;
  }

  get permanente(): boolean {
    return (
      this.kind === 'acesso_negado' ||
      this.kind === 'nao_encontrado' ||
      this.kind === 'sigiloso'
    );
  }
}

const PADROES: Array<[RegExp, SeiErrorKind]> = [
  [/acesso\s+negado|n[aã]o\s+(possui|tem)\s+permiss[aã]o|opera[çc][aã]o.*n[aã]o.*liberad/i, 'acesso_negado'],
  [/n[aã]o\s+encontrad|inexistente|inv[aá]lid[oa]\s+.*protocolo/i, 'nao_encontrado'],
  [/sigilos/i, 'sigiloso'],
  [/timeout|timed?\s*out|ETIMEDOUT|ESOCKETTIMEDOUT/i, 'timeout'],
  [/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|socket hang up|503|502|504/i, 'indisponivel'],
];

export function classificar(mensagem: string): SeiErrorKind {
  for (const [re, kind] of PADROES) {
    if (re.test(mensagem)) return kind;
  }
  return 'desconhecido';
}

export function toSeiError(operacao: string, err: unknown): SeiError {
  if (err instanceof SeiError) return err;

  const anyErr = err as Record<string, any> | null;
  const faultString =
    anyErr?.root?.Envelope?.Body?.Fault?.faultstring ??
    anyErr?.Fault?.faultstring ??
    anyErr?.body ??
    anyErr?.message ??
    String(err);

  const mensagem = typeof faultString === 'string' ? faultString : JSON.stringify(faultString);
  return new SeiError(operacao, mensagem, classificar(mensagem), err);
}
