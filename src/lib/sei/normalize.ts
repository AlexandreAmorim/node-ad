const OFFSET_BRASILIA = '-03:00';

/** Aceita `dd/MM/yyyy` e `dd/MM/yyyy HH:mm:ss`. Devolve null se não parsear. */
export function parseDataHoraSei(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(valor.trim());
  if (!m) return null;

  const [, dd, mm, yyyy, hh = '00', mi = '00', ss = '00'] = m;
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}${OFFSET_BRASILIA}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Data pura (sem hora), útil para DataAutuacao — retorna YYYY-MM-DD. */
export function parseDataSei(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(valor.trim());
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function formatDataSei(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(date.getDate())}/${p(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function toArray<T>(valor: unknown): T[] {
  if (valor === null || valor === undefined) return [];
  if (Array.isArray(valor)) return valor as T[];
  if (typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;
    if ('item' in obj) return toArray<T>(obj.item);
    return [valor as T];
  }
  return [valor as T];
}

export const sim = (v: unknown): boolean => v === 'S' || v === true;
export const sn = (v: boolean): 'S' | 'N' => (v ? 'S' : 'N');

export function somenteDigitos(protocolo: string): string {
  return protocolo.replace(/\D/g, '');
}

export function protocoloValido(protocolo: string): boolean {
  const digitos = somenteDigitos(protocolo);
  return digitos.length >= 10 && digitos.length <= 25;
}
