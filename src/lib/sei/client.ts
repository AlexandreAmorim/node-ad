import * as soap from 'soap';
import { env } from '../../config/env';
import { toSeiError, SeiError } from './errors';
import { toArray } from './normalize';
import type {
  Andamento,
  ConsultarDocumentoParams,
  ConsultarProcedimentoParams,
  ListarAndamentosParams,
  ListarTiposProcedimentoParams,
  ListarUnidadesParams,
  ParamsBase,
  RetornoConsultaDocumento,
  RetornoConsultaProcedimento,
  SeiClient,
  TipoProcedimento,
  Unidade,
} from './types';

type SoapClientLike = Record<string, (...args: unknown[]) => unknown> & {
  setEndpoint?: (url: string) => void;
};

export class SeiSoapClient implements SeiClient {
  #clientPromise: Promise<SoapClientLike> | null = null;

  readonly #base: ParamsBase;

  constructor(base?: Partial<ParamsBase>) {
    this.#base = {
      SiglaSistema: base?.SiglaSistema ?? env.SEI_SIGLA_SISTEMA,
      IdentificacaoServico: base?.IdentificacaoServico ?? env.SEI_CHAVE_ACESSO,
      IdUnidade: base?.IdUnidade ?? env.SEI_ID_UNIDADE,
    };
  }

  async #client(): Promise<SoapClientLike> {
    this.#clientPromise ??= soap
      .createClientAsync(env.SEI_WSDL_URL, {
        wsdl_options: { timeout: env.SEI_TIMEOUT_MS },
        overrideRootElement: undefined,
        forceSoap12Headers: false,
        disableCache: false,
      })
      .then((client) => {
        (client as unknown as { httpHeaders?: Record<string, string> }).httpHeaders = {
          'Content-Type': `text/xml; charset=${env.SEI_ENCODING}`,
        };
        return client as unknown as SoapClientLike;
      })
      .catch((err) => {
        this.#clientPromise = null;
        throw toSeiError('createClient', err);
      });

    return this.#clientPromise;
  }

  async #call<T>(operacao: string, args: Record<string, unknown>): Promise<T> {
    const client = await this.#client();
    const metodo = client[`${operacao}Async`];

    if (typeof metodo !== 'function') {
      throw new SeiError(
        operacao,
        `Operação não existe no WSDL. Confirme se ela foi liberada no cadastro do serviço no SEI.`,
        'acesso_negado',
      );
    }

    let bruto: unknown;
    try {
      const resultado = (await metodo.call(client, args)) as unknown[];
      bruto = resultado?.[0];
    } catch (err) {
      throw toSeiError(operacao, err);
    }

    const envelope = bruto as Record<string, unknown> | null | undefined;
    const payload =
      envelope && typeof envelope === 'object'
        ? (envelope.parametros ?? envelope.Retorno ?? envelope.return ?? envelope)
        : envelope;

    return payload as T;
  }

  #args(extra: Record<string, unknown>, override?: Partial<ParamsBase>): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...this.#base, ...override, ...extra };
    for (const key of Object.keys(merged)) {
      if (merged[key] === undefined) delete merged[key];
    }
    return merged;
  }

  async consultarProcedimento(
    params: Omit<ConsultarProcedimentoParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<RetornoConsultaProcedimento> {
    const { SiglaSistema, IdentificacaoServico, IdUnidade, ...resto } = params;

    const bruto = await this.#call<Record<string, unknown>>(
      'consultarProcedimento',
      this.#args(
        {
          SinRetornarAssuntos: 'N',
          SinRetornarInteressados: 'N',
          SinRetornarObservacoes: 'N',
          SinRetornarAndamentoGeracao: 'N',
          SinRetornarAndamentoConclusao: 'N',
          SinRetornarUltimoAndamento: 'N',
          SinRetornarUnidadesProcedimentoAberto: 'N',
          SinRetornarProcedimentosRelacionados: 'N',
          SinRetornarProcedimentosAnexados: 'N',
          ...resto,
        },
        { SiglaSistema, IdentificacaoServico, IdUnidade },
      ),
    );

    return {
      ...bruto,
      UnidadesProcedimentoAberto: toArray(bruto.UnidadesProcedimentoAberto),
      Assuntos: toArray(bruto.Assuntos),
      Interessados: toArray(bruto.Interessados),
      Observacoes: toArray(bruto.Observacoes),
      ProcedimentosRelacionados: toArray(bruto.ProcedimentosRelacionados),
      ProcedimentosAnexados: toArray(bruto.ProcedimentosAnexados),
    } as RetornoConsultaProcedimento;
  }

  async listarAndamentos(
    params: Omit<ListarAndamentosParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<Andamento[]> {
    const { SiglaSistema, IdentificacaoServico, IdUnidade, ...resto } = params;

    const temFiltro =
      (resto.Andamentos?.length ?? 0) > 0 ||
      (resto.Tarefas?.length ?? 0) > 0 ||
      (resto.TarefasModulos?.length ?? 0) > 0;

    if (!temFiltro) {
      throw new SeiError(
        'listarAndamentos',
        'É obrigatório informar Andamentos, Tarefas ou TarefasModulos. ' +
          'Configure SEI_TAREFAS_ANDAMENTO com os ids de TarefaRN.php.',
        'desconhecido',
      );
    }

    const bruto = await this.#call<unknown>(
      'listarAndamentos',
      this.#args({ SinRetornarAtributos: 'N', ...resto }, {
        SiglaSistema,
        IdentificacaoServico,
        IdUnidade,
      }),
    );

    return toArray<Andamento>(bruto).map((a) => ({
      ...a,
      Atributos: toArray(a.Atributos),
    }));
  }

  async consultarDocumento(
    params: Omit<ConsultarDocumentoParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<RetornoConsultaDocumento> {
    const { SiglaSistema, IdentificacaoServico, IdUnidade, ...resto } = params;
    return this.#call<RetornoConsultaDocumento>(
      'consultarDocumento',
      this.#args(
        {
          SinRetornarAndamentoGeracao: 'N',
          SinRetornarAssinaturas: 'N',
          SinRetornarPublicacao: 'N',
          SinRetornarCampos: 'N',
          SinRetornarBlocos: 'N',
          ...resto,
        },
        { SiglaSistema, IdentificacaoServico, IdUnidade },
      ),
    );
  }

  async listarUnidades(params: Partial<ListarUnidadesParams> = {}): Promise<Unidade[]> {
    const args = this.#args({
      IdTipoProcedimento: params.IdTipoProcedimento,
      IdSerie: params.IdSerie,
    });
    delete args.IdUnidade;

    const bruto = await this.#call<unknown>('listarUnidades', args);
    return toArray<Unidade>(bruto);
  }

  async listarTiposProcedimento(
    params: Partial<ListarTiposProcedimentoParams> = {},
  ): Promise<TipoProcedimento[]> {
    const bruto = await this.#call<unknown>(
      'listarTiposProcedimento',
      this.#args({ IdSerie: params.IdSerie, SinIndividual: params.SinIndividual }),
    );
    return toArray<TipoProcedimento>(bruto);
  }
}
