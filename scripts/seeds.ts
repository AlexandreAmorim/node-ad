import { prisma } from '../src/lib/prisma';
import { processosRepo } from '../src/service/seiRepository';
import { sincronizarProcesso } from '../src/service/seiSync';

/**
 * Cadastra processos de exemplo e faz a primeira sincronização.
 * Com SEI_MOCK=true popula o banco sem tocar no SEI real.
 */

const EXEMPLOS = [
  { protocolo: '12.1.000000077-4', rotulo: 'Contrato de manutenção' },
  { protocolo: '12.1.000000078-2', rotulo: 'Solicitação de licença' },
  { protocolo: '11.1.000000293-2', rotulo: 'Processo antigo' },
  // Dispara "não encontrado" no mock, para exercitar o caminho de erro.
  { protocolo: '00.0.000000000-0', rotulo: 'Protocolo inválido (teste de erro)' },
];

async function main(): Promise<void> {
  for (const ex of EXEMPLOS) {
    const p = await processosRepo.criar(ex);
    const r = await sincronizarProcesso(p);
    console.log(
      `${ex.protocolo.padEnd(22)} ${r.sucesso ? 'ok' : `FALHOU (${r.erroTipo})`}` +
        `${r.sucesso ? ` — ${r.concluido ? 'concluído' : 'em andamento'}` : ''}`,
    );
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
