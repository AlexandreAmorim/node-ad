/** OUs típicas de cargo/grupo — não são seção organizacional. */
const OUS_CARGO = new Set([
  'ADMINISTRADORES',
  'ADMINISTRATOR',
  'ADMINS',
  'USERS',
  'USUARIOS',
  'USUÁRIOS',
  'GROUPS',
  'GRUPOS',
  'COMPUTERS',
  'DOMAIN CONTROLLERS',
]);

export interface DnParseResult {
  /** OUs do DN, da mais específica à mais geral (antes dos DCs). */
  ous: string[];
  /** Caminho OU unido por `/` (ex.: ADMINISTRADORES/ASSTIC). */
  ouPath: string;
}

/**
 * Extrai OUs de um DN LDAP.
 * Ex.: CN=X,OU=ADMINISTRADORES,OU=ASSTIC,DC=segov,... → ['ADMINISTRADORES','ASSTIC']
 */
export function parseDn(dn: string | null | undefined): DnParseResult {
  if (!dn?.trim()) return { ous: [], ouPath: '' };

  const ous: string[] = [];
  for (const parte of dn.split(',')) {
    const p = parte.trim();
    if (/^OU=/i.test(p)) {
      ous.push(p.slice(3).trim());
    }
  }

  return { ous, ouPath: ous.join('/') };
}

export function isOuCargo(ou: string): boolean {
  return OUS_CARGO.has(ou.trim().toUpperCase());
}

/**
 * Escolhe o código de seção a partir das OUs do DN.
 * Prefere a primeira OU (da específica → geral) que existir em `ouCodigosMapeados`.
 * Se nenhuma bater, usa a primeira OU que não seja de cargo; senão a última OU.
 */
export function resolverOuCodigo(
  ous: string[],
  ouCodigosMapeados: Set<string> | string[],
): string | null {
  if (!ous.length) return null;

  const mapeados =
    ouCodigosMapeados instanceof Set
      ? ouCodigosMapeados
      : new Set(ouCodigosMapeados.map((c) => c.toUpperCase()));

  for (const ou of ous) {
    if (mapeados.has(ou.toUpperCase())) return ou.toUpperCase();
  }

  // Percorre da mais geral para a específica (seção costuma ser pai de cargo).
  for (let i = ous.length - 1; i >= 0; i--) {
    const ou = ous[i];
    if (!isOuCargo(ou)) return ou.toUpperCase();
  }

  return ous[ous.length - 1]?.toUpperCase() ?? null;
}

export type PapelUsuario = 'solicitante' | 'atendente' | 'admin';

/**
 * Deriva papéis a partir do DN e memberOf do AD.
 */
export function derivarPapeis(
  ous: string[],
  memberOf?: string | string[] | null,
): PapelUsuario[] {
  const papeis = new Set<PapelUsuario>(['solicitante', 'atendente']);

  const grupos = Array.isArray(memberOf)
    ? memberOf
    : typeof memberOf === 'string'
      ? [memberOf]
      : [];

  const temAdminGrupo = grupos.some((g) =>
    /CN=Domain Admins/i.test(g) || /CN=Administrators/i.test(g),
  );
  const temAdminOu = ous.some((ou) => /^ADMINISTRADORES?$/i.test(ou));

  if (temAdminGrupo || temAdminOu) {
    papeis.add('admin');
  }

  return Array.from(papeis);
}
