import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import * as soap from 'soap';
import { env } from '../../config/env';
import { toSeiError, SeiError } from './errors';
import { arr, buildEnvelope, struct, type SeiParam } from './encoder';
import { toArray } from './normalize';
import type {
  Andamento,
  ConsultarDocumentoParams,
  ConsultarProcedimentoParams,
  GerarProcedimentoDados,
  ListarAndamentosParams,
  ListarTiposProcedimentoParams,
  ListarUnidadesParams,
  ParamsBase,
  RetornoConsultaBloco,
  RetornoConsultaDocumento,
  RetornoConsultaProcedimento,
  RetornoGeracaoProcedimento,
  SeiClient,
  TipoProcedimento,
  Unidade,
} from './types';

type SoapClientLike = Record<string, (...args: unknown[]) => unknown> & {
  setEndpoint?: (url: string) => void;
};

export class SeiSoapClient implements SeiClient {
  #clientPromise: Promise<SoapClientLike> | null = null;
  #parser = new XMLParser({
    ignoreAttributes: true,
    transformTagName: (tag) => tag.replace(/^.*:/, ''),
    parseTagValue: false,
  });

  readonly #base: ParamsBase;

  constructor(base?: Partial<ParamsBase>) {
    this.#base = {
      SiglaSistema: base?.SiglaSistema ?? env.SEI_SIGLA_SISTEMA,
      IdentificacaoServico: base?.IdentificacaoServico ?? env.SEI_CHAVE_ACESSO,
      IdUnidade: base?.IdUnidade ?? env.SEI_ID_UNIDADE,
    };
  }

  #unidade(override?: string): string {
    return override || this.#base.IdUnidade;
  }

  #authParams(): SeiParam[] {
    return [
      ['SiglaSistema', this.#base.SiglaSistema],
      ['IdentificacaoServico', this.#base.IdentificacaoServico],
    ];
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

  /**
   * Chamada rpc/encoded com encoder próprio — necessária para arrays/structs
   * (gerarProcedimento, enviarProcesso, blocos).
   */
  async #rpcCall<T>(operation: string, params: SeiParam[]): Promise<T> {
    const envelope = buildEnvelope(operation, params);
    const endpoint = env.SEI_ENDPOINT || env.SEI_WSDL_URL;

    try {
      const { data, status } = await axios.post(endpoint, envelope, {
        headers: {
          'Content-Type': `text/xml; charset=${env.SEI_ENCODING}`,
          SOAPAction: 'SeiAction',
        },
        timeout: env.SEI_TIMEOUT_MS,
        validateStatus: () => true,
        responseType: 'text',
        transformResponse: [(d) => d],
      });

      const parsed = this.#parser.parse(data);
      const body = parsed?.Envelope?.Body;

      if (body?.Fault) {
        throw new SeiError(
          operation,
          body.Fault.faultstring ?? 'Falha não identificada no SeiWS',
          'desconhecido',
        );
      }

      if (status >= 500 && !body) {
        throw new SeiError(operation, `HTTP ${status} sem Fault SOAP`, 'indisponivel');
      }

      const response = body?.[`${operation}Response`];
      if (response === undefined) {
        throw new SeiError(operation, `Resposta inesperada em ${operation}`, 'desconhecido');
      }

      return (response.parametros ?? response) as T;
    } catch (err) {
      throw toSeiError(operation, err);
    }
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

  async listarAndamentosLivres(
    protocolo: string,
    opts: { idUnidade?: string; comAtributos?: boolean } = {},
  ): Promise<Andamento[]> {
    const r = await this.#rpcCall<{ item?: Andamento | Andamento[] }>('listarAndamentos', [
      ...this.#authParams(),
      ['IdUnidade', this.#unidade(opts.idUnidade)],
      ['ProtocoloProcedimento', protocolo],
      ['SinRetornarAtributos', opts.comAtributos ? 'S' : 'N'],
      ['Andamentos', ''],
      ['Tarefas', ''],
      ['TarefasModulos', ''],
    ]);

    return toArray<Andamento>(r?.item ?? r).map((a) => ({
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
      this.#args({
        IdUnidade: params.IdUnidade,
        IdSerie: params.IdSerie,
        SinIndividual: params.SinIndividual,
      }),
    );
    return toArray<TipoProcedimento>(bruto);
  }

  async consultarBloco(idBloco: string, idUnidade?: string): Promise<RetornoConsultaBloco> {
    const r = await this.#rpcCall<Record<string, unknown>>('consultarBloco', [
      ...this.#authParams(),
      ['IdUnidade', this.#unidade(idUnidade)],
      ['IdBloco', idBloco],
      ['SinRetornarProtocolos', 'S'],
    ]);

    return {
      Descricao: String(r.Descricao ?? ''),
      Estado: String(r.Estado ?? ''),
      Protocolos: toArray<{ ProtocoloFormatado: string; Identificacao?: string }>(
        (r as { Protocolos?: unknown }).Protocolos,
      ),
    };
  }

  async incluirProcessoBloco(
    idBloco: string,
    protocolo: string,
    opts: { idUnidade?: string; anotacao?: string } = {},
  ): Promise<void> {
    await this.#rpcCall('incluirProcessoBloco', [
      ...this.#authParams(),
      ['IdUnidade', this.#unidade(opts.idUnidade)],
      ['IdBloco', idBloco],
      ['ProtocoloProcedimento', protocolo],
      ['Anotacao', opts.anotacao ?? ''],
    ]);
  }

  async gerarProcedimento(
    dados: GerarProcedimentoDados,
    opts: {
      idUnidade?: string;
      unidadesEnvio?: string[];
      manterAbertoNaOrigem?: boolean;
    } = {},
  ): Promise<RetornoGeracaoProcedimento> {
    const unidadesEnvio = opts.unidadesEnvio ?? [];
    const manterAberto = opts.manterAbertoNaOrigem ?? true;

    const procedimento = struct('Procedimento', [
      ['IdTipoProcedimento', dados.idTipoProcedimento],
      ['NumeroProtocolo', ''],
      ['DataAutuacao', ''],
      ['Especificacao', dados.especificacao],
      [
        'Assuntos',
        dados.assuntos?.length
          ? arr(
              'ArrayOfAssunto',
              'sei:Assunto',
              dados.assuntos.map((a) =>
                struct('Assunto', [
                  ['CodigoEstruturado', a.codigoEstruturado],
                  ['Descricao', a.descricao ?? ''],
                ]),
              ),
            )
          : null,
      ],
      [
        'Interessados',
        dados.interessados?.length
          ? arr(
              'ArrayOfInteressado',
              'sei:Interessado',
              dados.interessados.map((i) =>
                struct('Interessado', [
                  ['IdContato', ''],
                  ['Cpf', i.cpf ?? ''],
                  ['Cnpj', ''],
                  ['Sigla', i.sigla ?? ''],
                  ['Nome', i.nome],
                ]),
              ),
            )
          : null,
      ],
      ['Observacao', dados.observacao ?? ''],
      ['NivelAcesso', dados.nivelAcesso ?? '0'],
      ['IdHipoteseLegal', dados.idHipoteseLegal ?? ''],
      ['IdTipoPrioridade', ''],
    ]);

    return this.#rpcCall<RetornoGeracaoProcedimento>('gerarProcedimento', [
      ...this.#authParams(),
      ['IdUnidade', this.#unidade(opts.idUnidade)],
      ['Procedimento', procedimento],
      ['Documentos', null],
      ['ProcedimentosRelacionados', null],
      [
        'UnidadesEnvio',
        unidadesEnvio.length ? arr('ArrayOfIdUnidade', 'xsd:string', unidadesEnvio) : null,
      ],
      ['SinManterAbertoUnidade', manterAberto ? 'S' : 'N'],
      ['SinEnviarEmailNotificacao', 'N'],
      ['DataRetornoProgramado', ''],
      ['DiasRetornoProgramado', ''],
      ['SinDiasUteisRetornoProgramado', ''],
      ['IdMarcador', ''],
      ['TextoMarcador', ''],
      ['DataControlePrazo', ''],
      ['DiasControlePrazo', ''],
      ['SinDiasUteisControlePrazo', ''],
    ]);
  }

  async enviarProcesso(
    protocolo: string,
    unidadesDestino: string[],
    opts: { idUnidadeOrigem?: string; manterAbertoNaOrigem?: boolean } = {},
  ): Promise<void> {
    await this.#rpcCall('enviarProcesso', [
      ...this.#authParams(),
      ['IdUnidade', this.#unidade(opts.idUnidadeOrigem)],
      ['ProtocoloProcedimento', protocolo],
      ['UnidadesDestino', arr('ArrayOfIdUnidade', 'xsd:string', unidadesDestino)],
      ['SinManterAbertoUnidade', opts.manterAbertoNaOrigem ? 'S' : 'N'],
      ['SinRemoverAnotacao', 'N'],
      ['SinEnviarEmailNotificacao', 'N'],
      ['DataRetornoProgramado', ''],
      ['DiasRetornoProgramado', ''],
      ['SinDiasUteisRetornoProgramado', ''],
      ['SinReabrir', 'S'],
    ]);
  }
}
