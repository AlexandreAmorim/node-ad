export const errorAuthSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string' },
  },
  required: ['success', 'message'],
};

export const errorSeiSchema = {
  type: 'object',
  properties: {
    erro: { type: 'string' },
    detalhes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          campo: { type: 'string' },
          mensagem: { type: 'string' },
        },
      },
    },
  },
  required: ['erro'],
};

export const errorNotFoundSchema = {
  type: 'object',
  properties: {
    erro: { type: 'string', example: 'Processo não encontrado' },
  },
  required: ['erro'],
};

export const authUserSchema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    displayName: { type: 'string' },
    email: { type: 'string' },
    dn: { type: 'string' },
  },
  required: ['username', 'displayName', 'email', 'dn'],
};

export const authUserDetailSchema = {
  type: 'object',
  properties: {
    username: { type: 'string' },
    displayName: { type: 'string' },
    email: { type: 'string' },
    dn: { type: 'string' },
    memberOf: {
      oneOf: [
        { type: 'array', items: { type: 'string' } },
        { type: 'string' },
      ],
    },
    department: { type: 'string' },
    title: { type: 'string' },
  },
  required: ['username', 'displayName', 'email', 'dn'],
};

export const processoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    protocolo: { type: 'string' },
    idProcedimento: { type: 'string', nullable: true },
    tipoProcedimento: { type: 'string', nullable: true },
    especificacao: { type: 'string', nullable: true },
    dataAutuacao: { type: 'string', format: 'date-time', nullable: true },
    nivelAcessoGlobal: { type: 'string', nullable: true },
    linkAcesso: { type: 'string', nullable: true },
    concluido: { type: 'boolean' },
    unidadesAbertas: {
      type: 'array',
      items: { type: 'object', additionalProperties: true },
    },
    ultimoAndamento: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string' },
        em: { type: 'string', format: 'date-time', nullable: true },
        texto: { type: 'string', nullable: true },
      },
    },
    ativo: { type: 'boolean' },
    rotulo: { type: 'string', nullable: true },
    observacaoInterna: { type: 'string', nullable: true },
    sincronizadoEm: { type: 'string', format: 'date-time', nullable: true },
    proximaSincronizacao: { type: 'string', format: 'date-time', nullable: true },
    falhasConsecutivas: { type: 'integer' },
    ultimoErro: {
      type: 'object',
      nullable: true,
      properties: {
        mensagem: { type: 'string' },
        tipo: { type: 'string', nullable: true },
      },
    },
    criadoEm: { type: 'string', format: 'date-time' },
  },
  required: ['id', 'protocolo', 'concluido', 'ativo', 'criadoEm'],
};

export const andamentoSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    idAndamento: { type: 'string', nullable: true },
    idTarefa: { type: 'string', nullable: true },
    descricao: { type: 'string', nullable: true },
    ocorridoEm: { type: 'string', format: 'date-time', nullable: true },
    unidade: {
      type: 'object',
      nullable: true,
      properties: {
        id: { type: 'string', nullable: true },
        sigla: { type: 'string', nullable: true },
        nome: { type: 'string', nullable: true },
      },
    },
    usuario: {
      type: 'object',
      nullable: true,
      properties: {
        sigla: { type: 'string', nullable: true },
        nome: { type: 'string', nullable: true },
      },
    },
    atributos: {},
  },
  required: ['id'],
};

export const eventoSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    processoId: { type: 'string' },
    tipo: { type: 'string' },
    payload: {},
    criadoEm: { type: 'string', format: 'date-time' },
    processadoEm: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['id', 'processoId', 'tipo', 'criadoEm'],
};

export const processoIdParamsSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'ID do processo' },
  },
  required: ['id'],
};

export const bearerSecurity = [{ bearerAuth: [] }];
