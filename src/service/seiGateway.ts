import { env } from '../config/env';
import { getSeiClient } from '../lib/sei';
import { createLimiter, TtlCache } from '../lib/sei/cache';
import type {
  GerarProcedimentoDados,
  RetornoConsultaProcedimento,
  Unidade,
} from '../lib/sei/types';

function estaAbertoNaUnidade(proc: RetornoConsultaProcedimento, idUnidade: string): boolean {
  return (proc.UnidadesProcedimentoAberto ?? []).some(
    (u) => u.Unidade?.IdUnidade === idUnidade,
  );
}

/**
 * Camada de aplicação sobre o SeiClient — alinhada ao gateway segov/sei:
 * concorrência limitada + cache de unidades/tipos.
 */
class SeiGateway {
  readonly #limit = createLimiter(env.SEI_MAX_CONCURRENCY);
  readonly #cache = new TtlCache(env.SEI_CACHE_TTL_MS);

  resolverUnidade(idUnidade?: string): string {
    return idUnidade || env.SEI_ID_UNIDADE;
  }

  listarUnidades(): Promise<Unidade[]> {
    const sei = getSeiClient();
    return this.#cache.wrap('unidades', () => this.#limit(() => sei.listarUnidades()));
  }

  listarTiposProcedimento(idUnidade: string) {
    const sei = getSeiClient();
    return this.#cache.wrap(`tipos:${idUnidade}`, () =>
      this.#limit(() => sei.listarTiposProcedimento({ IdUnidade: idUnidade })),
    );
  }

  consultarProcedimento(
    protocolo: string,
    opts: {
      idUnidade?: string;
      interessados?: boolean;
      assuntos?: boolean;
      observacoes?: boolean;
      ultimoAndamento?: boolean;
      unidadesAberto?: boolean;
      relacionados?: boolean;
      anexados?: boolean;
    } = {},
  ) {
    const sei = getSeiClient();
    const sn = (b?: boolean) => (b ? 'S' : 'N') as 'S' | 'N';

    return this.#limit(() =>
      sei.consultarProcedimento({
        ProtocoloProcedimento: protocolo,
        IdUnidade: this.resolverUnidade(opts.idUnidade),
        SinRetornarInteressados: sn(opts.interessados ?? true),
        SinRetornarAssuntos: sn(opts.assuntos ?? true),
        SinRetornarObservacoes: sn(opts.observacoes ?? false),
        SinRetornarUltimoAndamento: sn(opts.ultimoAndamento ?? true),
        SinRetornarUnidadesProcedimentoAberto: sn(opts.unidadesAberto ?? true),
        SinRetornarProcedimentosRelacionados: sn(opts.relacionados ?? false),
        SinRetornarProcedimentosAnexados: sn(opts.anexados ?? false),
      }),
    );
  }

  listarAndamentos(protocolo: string, opts: { idUnidade?: string; atributos?: boolean } = {}) {
    const sei = getSeiClient();
    return this.#limit(() =>
      sei.listarAndamentosLivres(protocolo, {
        idUnidade: this.resolverUnidade(opts.idUnidade),
        comAtributos: opts.atributos,
      }),
    );
  }

  consultarBloco(idBloco: string, idUnidade?: string) {
    const sei = getSeiClient();
    return this.#limit(() => sei.consultarBloco(idBloco, this.resolverUnidade(idUnidade)));
  }

  incluirProcessoBloco(
    idBloco: string,
    protocolo: string,
    opts: { idUnidade?: string; anotacao?: string } = {},
  ) {
    const sei = getSeiClient();
    return this.#limit(() =>
      sei.incluirProcessoBloco(idBloco, protocolo, {
        idUnidade: this.resolverUnidade(opts.idUnidade),
        anotacao: opts.anotacao,
      }),
    );
  }

  gerarProcedimento(
    dados: GerarProcedimentoDados,
    opts: {
      idUnidade?: string;
      unidadesEnvio?: string[];
      manterAbertoNaOrigem?: boolean;
    } = {},
  ) {
    const sei = getSeiClient();
    return this.#limit(() =>
      sei.gerarProcedimento(dados, {
        idUnidade: this.resolverUnidade(opts.idUnidade),
        unidadesEnvio: opts.unidadesEnvio,
        manterAbertoNaOrigem: opts.manterAbertoNaOrigem,
      }),
    );
  }

  enviarProcesso(
    protocolo: string,
    unidadesDestino: string[],
    opts: { idUnidadeOrigem?: string; manterAbertoNaOrigem?: boolean } = {},
  ) {
    const sei = getSeiClient();
    return this.#limit(() =>
      sei.enviarProcesso(protocolo, unidadesDestino, {
        idUnidadeOrigem: this.resolverUnidade(opts.idUnidadeOrigem),
        manterAbertoNaOrigem: opts.manterAbertoNaOrigem,
      }),
    );
  }

  /**
   * Hidrata os processos de um Bloco Interno (índice do SeiWS).
   * Falhas isoladas vão para `falhas` sem derrubar a listagem.
   */
  async listarProcessosDoBloco(
    idBloco: string,
    opts: { idUnidade?: string; apenasAbertos?: boolean } = {},
  ): Promise<{
    total: number;
    falhas: string[];
    processos: RetornoConsultaProcedimento[];
  }> {
    const idUnidade = this.resolverUnidade(opts.idUnidade);
    const bloco = await this.consultarBloco(idBloco, idUnidade);
    const falhas: string[] = [];

    const resultados = await Promise.all(
      bloco.Protocolos.map(async (p) => {
        try {
          return await this.consultarProcedimento(p.ProtocoloFormatado, {
            idUnidade,
            interessados: true,
            assuntos: true,
            ultimoAndamento: true,
            unidadesAberto: true,
          });
        } catch {
          falhas.push(p.ProtocoloFormatado);
          return null;
        }
      }),
    );

    let processos = resultados.filter((p): p is RetornoConsultaProcedimento => p !== null);

    if (opts.apenasAbertos) {
      processos = processos.filter((p) => estaAbertoNaUnidade(p, idUnidade));
    }

    return { total: bloco.Protocolos.length, falhas, processos };
  }

  invalidarCache(prefix?: string): void {
    this.#cache.invalidate(prefix);
  }
}

export const seiGateway = new SeiGateway();
