import type {
  Andamento,
  ConsultarProcedimentoParams,
  ListarAndamentosParams,
  ParamsBase,
  RetornoConsultaDocumento,
  RetornoConsultaProcedimento,
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
}

function dataHoraSei(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${formatDataSei(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export class SeiMockClient implements SeiClient {
  #estados = new Map<string, EstadoMock>();

  readonly avancoPorConsulta: number;
  readonly protocolosInexistentes: Set<string>;

  constructor(opts: { avancoPorConsulta?: number; protocolosInexistentes?: string[] } = {}) {
    this.avancoPorConsulta = opts.avancoPorConsulta ?? 1;
    this.protocolosInexistentes = new Set(opts.protocolosInexistentes ?? ['00.0.000000000-0']);
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
            : [{ Unidade: ultimo.Unidade, UsuarioAtribuicao: USUARIO }]
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

  async consultarDocumento(): Promise<RetornoConsultaDocumento> {
    throw new SeiError('consultarDocumento', 'Não implementado no mock.', 'desconhecido');
  }

  async listarUnidades(): Promise<Unidade[]> {
    return UNIDADES;
  }

  async listarTiposProcedimento(): Promise<TipoProcedimento[]> {
    return TIPOS;
  }
}
