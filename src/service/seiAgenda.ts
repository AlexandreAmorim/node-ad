const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

export const INTERVALOS = {
  quente: 15 * MINUTO,
  morno: 1 * HORA,
  frio: 6 * HORA,
  gelado: 1 * DIA,
  concluido: 7 * DIA,
} as const;

export function proximaSincronizacao(opts: {
  ultimoAndamentoEm: Date | null;
  concluido: boolean;
  agora?: Date;
}): Date {
  const agora = opts.agora ?? new Date();

  if (opts.concluido) return new Date(agora.getTime() + INTERVALOS.concluido);

  const idadeMs = opts.ultimoAndamentoEm
    ? agora.getTime() - opts.ultimoAndamentoEm.getTime()
    : Number.POSITIVE_INFINITY;

  let intervalo: number;
  if (idadeMs <= DIA) intervalo = INTERVALOS.quente;
  else if (idadeMs <= 7 * DIA) intervalo = INTERVALOS.morno;
  else if (idadeMs <= 30 * DIA) intervalo = INTERVALOS.frio;
  else intervalo = INTERVALOS.gelado;

  const jitter = intervalo * 0.1 * (Math.random() * 2 - 1);
  return new Date(agora.getTime() + intervalo + jitter);
}

export function proximaTentativaAposFalha(falhasConsecutivas: number, agora = new Date()): Date {
  const base = 5 * MINUTO;
  const espera = Math.min(base * 2 ** Math.max(0, falhasConsecutivas - 1), 6 * HORA);
  const jitter = espera * 0.2 * Math.random();
  return new Date(agora.getTime() + espera + jitter);
}
