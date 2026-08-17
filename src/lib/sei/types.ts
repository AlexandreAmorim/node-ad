/**
 * Estruturas de dados do SEI Web Services v5.0.
 * Nomes em PascalCase conforme o manual SOAP.
 */

export type SinNao = 'S' | 'N';

/** 0 = público, 1 = restrito, 2 = sigiloso */
export type NivelAcesso = '0' | '1' | '2';

export interface Unidade {
  IdUnidade: string;
  Sigla: string;
  Descricao: string;
  SinProtocolo?: SinNao;
  SinArquivamento?: SinNao;
  SinOuvidoria?: SinNao;
}

export interface Usuario {
  IdUsuario: string;
  Sigla: string;
  Nome: string;
}

export interface AtributoAndamento {
  Nome: string;
  Valor: string;
  IdOrigem?: string;
}

export interface Andamento {
  IdAndamento: string;
  IdTarefa: string;
  IdTarefaModulo?: string;
  Descricao: string;
  /** Formato do SEI: dd/MM/yyyy HH:mm:ss */
  DataHora: string;
  Unidade: Unidade;
  Usuario: Usuario;
  Atributos?: AtributoAndamento[];
}

export interface Assunto {
  CodigoEstruturado: string;
  Descricao: string;
}

export interface Interessado {
  Sigla?: string;
  Nome?: string;
  IdContato?: string;
  Cpf?: string;
  Cnpj?: string;
}

export interface Observacao {
  Descricao: string;
  Unidade: Unidade;
}

export interface TipoProcedimento {
  IdTipoProcedimento: string;
  Nome: string;
  SinOuvidoriaAnonimo?: SinNao;
}

export interface TipoPrioridade {
  IdTipoPrioridade: string;
  Nome: string;
}

export interface UnidadeProcedimentoAberto {
  Unidade: Unidade;
  UsuarioAtribuicao: Usuario | null;
}

export interface ProcedimentoResumido {
  IdTipoProcedimento: string;
  ProcedimentoFormatado: string;
  TipoProcedimento: TipoProcedimento;
}

export interface Serie {
  IdSerie: string;
  Nome: string;
  Aplicabilidade: 'T' | 'I' | 'E' | 'F';
}

export interface RetornoConsultaProcedimento {
  IdProcedimento: string;
  ProcedimentoFormatado: string;
  Especificacao: string;
  DataAutuacao: string;
  NivelAcessoLocal: NivelAcesso;
  NivelAcessoGlobal: NivelAcesso;
  LinkAcesso: string;
  TipoProcedimento: TipoProcedimento;
  TipoPrioridade: TipoPrioridade | null;
  AndamentoGeracao?: Andamento;
  AndamentoConclusao?: Andamento | null;
  UltimoAndamento?: Andamento;
  UnidadesProcedimentoAberto?: UnidadeProcedimentoAberto[];
  Assuntos?: Assunto[];
  Interessados?: Interessado[];
  Observacoes?: Observacao[];
  ProcedimentosRelacionados?: ProcedimentoResumido[];
  ProcedimentosAnexados?: ProcedimentoResumido[];
}

export interface RetornoConsultaDocumento {
  IdProcedimento: string;
  ProcedimentoFormatado: string;
  IdDocumento: string;
  DocumentoFormatado: string;
  NivelAcessoLocal: NivelAcesso;
  NivelAcessoGlobal: NivelAcesso;
  LinkAcesso: string;
  Serie: Serie;
  Numero: string | null;
  NomeArvore: string | null;
  Descricao: string | null;
  Data: string;
  UnidadeElaboradora: Unidade;
  AndamentoGeracao?: Andamento;
}

export interface ParamsBase {
  SiglaSistema: string;
  IdentificacaoServico: string;
  IdUnidade: string;
}

export interface ConsultarProcedimentoParams extends ParamsBase {
  ProtocoloProcedimento: string;
  SinRetornarAssuntos?: SinNao;
  SinRetornarInteressados?: SinNao;
  SinRetornarObservacoes?: SinNao;
  SinRetornarAndamentoGeracao?: SinNao;
  SinRetornarAndamentoConclusao?: SinNao;
  SinRetornarUltimoAndamento?: SinNao;
  SinRetornarUnidadesProcedimentoAberto?: SinNao;
  SinRetornarProcedimentosRelacionados?: SinNao;
  SinRetornarProcedimentosAnexados?: SinNao;
}

export interface ListarAndamentosParams extends ParamsBase {
  ProtocoloProcedimento: string;
  SinRetornarAtributos?: SinNao;
  Andamentos?: string[];
  Tarefas?: string[];
  TarefasModulos?: string[];
}

export interface ConsultarDocumentoParams extends ParamsBase {
  ProtocoloDocumento: string;
  SinRetornarAndamentoGeracao?: SinNao;
  SinRetornarAssinaturas?: SinNao;
  SinRetornarPublicacao?: SinNao;
  SinRetornarCampos?: SinNao;
  SinRetornarBlocos?: SinNao;
}

export interface ListarUnidadesParams {
  SiglaSistema: string;
  IdentificacaoServico: string;
  IdTipoProcedimento?: string;
  IdSerie?: string;
}

export interface ListarTiposProcedimentoParams {
  SiglaSistema: string;
  IdentificacaoServico: string;
  IdUnidade?: string;
  IdSerie?: string;
  SinIndividual?: SinNao;
}

export interface SeiClient {
  consultarProcedimento(
    params: Omit<ConsultarProcedimentoParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<RetornoConsultaProcedimento>;

  listarAndamentos(
    params: Omit<ListarAndamentosParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<Andamento[]>;

  consultarDocumento(
    params: Omit<ConsultarDocumentoParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<RetornoConsultaDocumento>;

  listarUnidades(params?: Partial<ListarUnidadesParams>): Promise<Unidade[]>;

  listarTiposProcedimento(
    params?: Partial<ListarTiposProcedimentoParams>,
  ): Promise<TipoProcedimento[]>;
}
