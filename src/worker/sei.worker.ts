import { env } from '../config/env';
import { prisma } from '../lib/prisma';
import { executarCiclo } from '../service/seiSync';

/**
 * Worker de polling do SEI.
 * Roda separado da API para não competir com requisições do usuário.
 */

let rodando = true;
let cicloEmAndamento = false;

async function tick(): Promise<void> {
  if (cicloEmAndamento) {
    console.warn('[worker] ciclo anterior ainda em andamento, pulando este tick');
    return;
  }

  cicloEmAndamento = true;
  const inicio = Date.now();

  try {
    const resultados = await executarCiclo();
    if (resultados.length === 0) return;

    const ok = resultados.filter((r) => r.sucesso).length;
    const novos = resultados.reduce((acc, r) => acc + r.andamentosNovos, 0);
    const falhas = resultados.filter((r) => !r.sucesso);

    console.log(
      `[worker] ciclo em ${Date.now() - inicio}ms — ${resultados.length} processos, ` +
        `${ok} ok, ${falhas.length} falhas, ${novos} andamentos novos`,
    );

    for (const f of falhas) {
      console.error(`[worker] ${f.protocolo}: ${f.erroTipo} — ${f.erro}`);
    }
  } catch (err) {
    console.error('[worker] erro no ciclo:', err);
  } finally {
    cicloEmAndamento = false;
  }
}

async function main(): Promise<void> {
  console.log(
    `[worker] iniciado — tick ${env.WORKER_TICK_MS}ms, ` +
      `lote ${env.WORKER_BATCH_SIZE}, concorrência ${env.WORKER_CONCURRENCY}, ` +
      `client ${env.SEI_MOCK ? 'MOCK' : 'SOAP'}`,
  );

  if (env.SEI_TAREFAS_ANDAMENTO.length === 0) {
    console.warn(
      '[worker] SEI_TAREFAS_ANDAMENTO vazio: o histórico ficará limitado ao ' +
        'último andamento de cada consulta. Peça os ids de tarefa ao gestor do SEI.',
    );
  }

  await tick();

  const timer = setInterval(() => {
    if (rodando) void tick();
  }, env.WORKER_TICK_MS);

  const encerrar = async (sinal: string): Promise<void> => {
    console.log(`[worker] ${sinal} recebido, encerrando...`);
    rodando = false;
    clearInterval(timer);

    const limite = Date.now() + 30_000;
    while (cicloEmAndamento && Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 200));
    }

    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', () => void encerrar('SIGTERM'));
  process.on('SIGINT', () => void encerrar('SIGINT'));
}

main().catch(async (err) => {
  console.error('[worker] falha fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
