import { derivarPapeis, parseDn, resolverOuCodigo } from './ad-dn';

const DN =
  'CN=Milton Alexandre de Amorim,OU=ADMINISTRADORES,OU=ASSTIC,DC=segov,DC=palacio,DC=rj,DC=gov,DC=br,DC=local';

const { ous, ouPath } = parseDn(DN);
if (ous.join(',') !== 'ADMINISTRADORES,ASSTIC') {
  throw new Error(`ous inesperado: ${ous.join(',')}`);
}
if (ouPath !== 'ADMINISTRADORES/ASSTIC') {
  throw new Error(`ouPath inesperado: ${ouPath}`);
}

const secao = resolverOuCodigo(ous, ['ASSTIC', 'ASSJUR']);
if (secao !== 'ASSTIC') {
  throw new Error(`seção inesperada: ${secao}`);
}

const papeis = derivarPapeis(ous);
if (!papeis.includes('admin') || !papeis.includes('solicitante')) {
  throw new Error(`papéis inesperados: ${papeis.join(',')}`);
}

console.log('ad-dn.test ok');
