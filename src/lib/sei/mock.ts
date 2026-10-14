import type {
  Andamento,
  ConsultarProcedimentoParams,
  GerarProcedimentoDados,
  ListarAndamentosParams,
  ParamsBase,
  RetornoConsultaBloco,
  RetornoConsultaDocumento,
  RetornoConsultaProcedimento,
  RetornoGeracaoProcedimento,
  SeiClient,
  TipoProcedimento,
  Unidade,
} from './types';
import { SeiError } from './errors';
import { formatDataSei } from './normalize';

const UNIDADES: Unidade[] = [
  { IdUnidade: '110000001', Sigla: 'SEGOV/SUBGAB', Descricao: 'Subsecretaria de Gabinete' },
  { IdUnidade: '110000002', Sigla: 'SEGOV/ASSJUR', Descricao: 'Assessoria Jurídica' },
  { IdUnidade: '110000003', Sigla: 'SEGOV/PROT', Descricao: 'Protocolo', SinProtocolo: 'S' },
];

const TIPOS: TipoProcedimento[] = [
  { IdTipoProcedimento: '100000368', Nome: 'Administrativo: Solicitação de Serviço' },
  { IdTipoProcedimento: '100000412', Nome: 'Contrato: Fiscalização' },
];

const USUARIO = { IdUsuario: '100000777', Sigla: 'mamorim', Nome: 'Milton Amorim' };

const ROTEIRO: Array<{ IdTarefa: string; Descricao: string; unidade: number }> = [
  { IdTarefa: '1', Descricao: 'Processo público gerado', unidade: 2 },
  { IdTarefa: '5', Descricao: 'Processo remetido pela unidade SEGOV/PROT', unidade: 2 },
  { IdTarefa: '6', Descricao: 'Processo recebido na unidade SEGOV/SUBGAB', unidade: 0 },
  { IdTarefa: '65', Descricao: 'Análise técnica concluída, encaminhado para parecer', unidade: 0 },
  { IdTarefa: '5', Descricao: 'Processo remetido pela unidade SEGOV/SUBGAB', unidade: 0 },
  { IdTarefa: '6', Descricao: 'Processo recebido na unidade SEGOV/ASSJUR', unidade: 1 },
  { IdTarefa: '3', Descricao: 'Conclusão do processo na unidade SEGOV/ASSJUR', unidade: 1 },
];

interface EstadoMock {
  protocolo: string;
  idProcedimento: string;
  tipo: TipoProcedimento;
  especificacao: string;
  autuacao: Date;
  passo: number;
  andamentos: Andamento[];
  unidadeAberta: Unidade;
}

interface BlocoMock {
  id: string;
  descricao: string;
  estado: string;
  protocolos: string[];
}

function dataHoraSei(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDataSei(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function protocoloMock(seq: number): string {
  const n = String(seq).padStart(6, '0');
  return `070001.${n}/2026-45`;
}

export class SeiMockClient implements SeiClient {
  #estados = new Map<string, EstadoMock>();
  #blocos = new Map<string, BlocoMock>();
  #seqGerado = 0;

  readonly avancoPorConsulta: number;
  readonly protocolosInexistentes: Set<string>;

  constructor(opts: { avancoPorConsulta?: number; protocolosInexistentes?: string[] } = {}) {
    this.avancoPorConsulta = opts.avancoPorConsulta ?? 1;
    this.protocolosInexistentes = new Set(opts.protocolosInexistentes ?? ['00.0.000000000-0']);

    this.#blocos.set('1001', {
      id: '1001',
      descricao: 'Bloco de acompanhamento (mock)',
      estado: 'Aberto',
      protocolos: [],
    });
  }

  #estado(protocolo: string): EstadoMock {
    if (this.protocolosInexistentes.has(protocolo)) {
      throw new SeiError(
        'consultarProcedimento',
        `Processo ${protocolo} não encontrado.`,
        'nao_encontrado',
      );
    }

    let estado = this.#estados.get(protocolo);
    if (!estado) {
      const autuacao = new Date(Date.now() - 20 * 24 * 3600_000);
      const idx = this.#estados.size % TIPOS.length;
      estado = {
        protocolo,
        idProcedimento: `12100000${String(this.#estados.size).padStart(5, '0')}`,
        tipo: TIPOS[idx]!,
        especificacao: `Processo de teste ${protocolo}`,
        autuacao,
        passo: 0,
        andamentos: [],
        unidadeAberta: UNIDADES[0]!,
      };
      this.#estados.set(protocolo, estado);
      this.#avancar(estado, 3);
    }
    return estado;
  }

  #avancar(estado: EstadoMock, passos: number): void {
    for (let i = 0; i < passos; i++) {
      if (estado.passo >= ROTEIRO.length) return;
      const item = ROTEIRO[estado.passo]!;
      const quando = new Date(estado.autuacao.getTime() + estado.passo * 36 * 3600_000);
      estado.andamentos.push({
        IdAndamento: `${estado.idProcedimento}-${String(estado.passo + 1).padStart(3, '0')}`,
        IdTarefa: item.IdTarefa,
        Descricao: item.Descricao,
        DataHora: dataHoraSei(quando),
        Unidade: UNIDADES[item.unidade]!,
        Usuario: USUARIO,
        Atributos: [],
      });
      estado.unidadeAberta = UNIDADES[item.unidade]!;
      estado.passo += 1;
    }
  }

  #concluido(estado: EstadoMock): boolean {
    return estado.passo >= ROTEIRO.length;
  }

  async consultarProcedimento(
    params: Omit<ConsultarProcedimentoParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<RetornoConsultaProcedimento> {
    const estado = this.#estado(params.ProtocoloProcedimento);
    this.#avancar(estado, this.avancoPorConsulta);

    const ultimo = estado.andamentos.at(-1)!;
    const primeiro = estado.andamentos[0]!;
    const concluido = this.#concluido(estado);

    return {
      IdProcedimento: estado.idProcedimento,
      ProcedimentoFormatado: estado.protocolo,
      Especificacao: estado.especificacao,
      DataAutuacao: formatDataSei(estado.autuacao),
      NivelAcessoLocal: '0',
      NivelAcessoGlobal: '0',
      LinkAcesso: `https://sei.exemplo.rj.gov.br/sei/processo/${estado.idProcedimento}`,
      TipoProcedimento: estado.tipo,
      TipoPrioridade: null,
      AndamentoGeracao: params.SinRetornarAndamentoGeracao === 'S' ? primeiro : undefined,
      AndamentoConclusao:
        params.SinRetornarAndamentoConclusao === 'S' && concluido ? ultimo : null,
      UltimoAndamento: params.SinRetornarUltimoAndamento === 'S' ? ultimo : undefined,
      UnidadesProcedimentoAberto:
        params.SinRetornarUnidadesProcedimentoAberto === 'S'
          ? concluido
            ? []
            : [{ Unidade: estado.unidadeAberta, UsuarioAtribuicao: USUARIO }]
          : [],
      Assuntos:
        params.SinRetornarAssuntos === 'S'
          ? [{ CodigoEstruturado: '00.01.01.01', Descricao: 'Assunto de teste' }]
          : [],
      Interessados:
        params.SinRetornarInteressados === 'S'
          ? [{ Sigla: 'mamorim', Nome: 'Milton Amorim' }]
          : [],
      Observacoes: [],
      ProcedimentosRelacionados: [],
      ProcedimentosAnexados: [],
    };
  }

  async listarAndamentos(
    params: Omit<ListarAndamentosParams, keyof ParamsBase> & Partial<ParamsBase>,
  ): Promise<Andamento[]> {
    const temFiltro =
      (params.Andamentos?.length ?? 0) > 0 ||
      (params.Tarefas?.length ?? 0) > 0 ||
      (params.TarefasModulos?.length ?? 0) > 0;

    if (!temFiltro) {
      throw new SeiError(
        'listarAndamentos',
        'É obrigatório informar Andamentos, Tarefas ou TarefasModulos.',
        'desconhecido',
      );
    }

    const estado = this.#estado(params.ProtocoloProcedimento);

    return estado.andamentos.filter((a) => {
      if (params.Andamentos?.length) return params.Andamentos.includes(a.IdAndamento);
      if (params.Tarefas?.length) return params.Tarefas.includes(a.IdTarefa);
      return true;
    });
  }

  async listarAndamentosLivres(
    protocolo: string,
    _opts?: { idUnidade?: string; comAtributos?: boolean },
  ): Promise<Andamento[]> {
    return this.#estado(protocolo).andamentos;
  }

  async consultarDocumento(): Promise<RetornoConsultaDocumento> {
    throw new SeiError('consultarDocumento', 'Não implementado no mock.', 'desconhecido');
  }

  async listarUnidades(): Promise<Unidade[]> {
    return UNIDADES;
  }

  async listarTiposProcedimento(): Promise<TipoProcedimento[]> {
    return TIPOS;
  }

  async consultarBloco(idBloco: string): Promise<RetornoConsultaBloco> {
    const bloco = this.#blocos.get(idBloco);
    if (!bloco) {
      throw new SeiError('consultarBloco', `Bloco ${idBloco} não encontrado.`, 'nao_encontrado');
    }
    return {
      Descricao: bloco.descricao,
      Estado: bloco.estado,
      Protocolos: bloco.protocolos.map((p) => ({ ProtocoloFormatado: p })),
    };
  }

  async incluirProcessoBloco(
    idBloco: string,
    protocolo: string,
    _opts?: { idUnidade?: string; anotacao?: string },
  ): Promise<void> {
    let bloco = this.#blocos.get(idBloco);
    if (!bloco) {
      bloco = {
        id: idBloco,
        descricao: `Bloco ${idBloco}`,
        estado: 'Aberto',
        protocolos: [],
      };
      this.#blocos.set(idBloco, bloco);
    }
    this.#estado(protocolo);
    if (!bloco.protocolos.includes(protocolo)) {
      bloco.protocolos.push(protocolo);
    }
  }

  async gerarProcedimento(
    dados: GerarProcedimentoDados,
    opts: {
      idUnidade?: string;
      unidadesEnvio?: string[];
      manterAbertoNaOrigem?: boolean;
    } = {},
  ): Promise<RetornoGeracaoProcedimento> {
    this.#seqGerado += 1;
    const protocolo = protocoloMock(this.#seqGerado);
    const tipo =
      TIPOS.find((t) => t.IdTipoProcedimento === dados.idTipoProcedimento) ?? TIPOS[0]!;
    const unidadeOrigem =
      UNIDADES.find((u) => u.IdUnidade === opts.idUnidade) ?? UNIDADES[0]!;

    const estado: EstadoMock = {
      protocolo,
      idProcedimento: `12109000${String(this.#seqGerado).padStart(5, '0')}`,
      tipo,
      especificacao: dados.especificacao,
      autuacao: new Date(),
      passo: 0,
      andamentos: [],
      unidadeAberta: unidadeOrigem,
    };
    this.#estados.set(protocolo, estado);
    this.#avancar(estado, 1);

    if (opts.unidadesEnvio?.length) {
      const dest =
        UNIDADES.find((u) => u.IdUnidade === opts.unidadesEnvio![0]) ?? UNIDADES[1]!;
      if (!opts.manterAbertoNaOrigem) {
        estado.unidadeAberta = dest;
      }
    }

    return {
      IdProcedimento: estado.idProcedimento,
      ProcedimentoFormatado: protocolo,
      LinkAcesso: `https://sei.exemplo.rj.gov.br/sei/processo/${estado.idProcedimento}`,
    };
  }

  async enviarProcesso(
    protocolo: string,
    unidadesDestino: string[],
    opts: { idUnidadeOrigem?: string; manterAbertoNaOrigem?: boolean } = {},
  ): Promise<void> {
    const estado = this.#estado(protocolo);
    const dest =
      UNIDADES.find((u) => u.IdUnidade === unidadesDestino[0]) ?? UNIDADES[1]!;
    estado.andamentos.push({
      IdAndamento: `${estado.idProcedimento}-ENV`,
      IdTarefa: '5',
      Descricao: `Processo remetido para ${dest.Sigla}`,
      DataHora: dataHoraSei(new Date()),
      Unidade: estado.unidadeAberta,
      Usuario: USUARIO,
      Atributos: [],
    });
    if (!opts.manterAbertoNaOrigem) {
      estado.unidadeAberta = dest;
    }
  }
}
