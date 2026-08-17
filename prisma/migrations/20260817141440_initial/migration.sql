-- CreateEnum
CREATE TYPE "public"."evento_tipo" AS ENUM ('novo_andamento', 'mudou_unidade', 'concluido', 'reaberto', 'erro_sincronizacao');

-- CreateTable
CREATE TABLE "public"."settings" (
    "id" SERIAL NOT NULL,
    "sipol_status" BOOLEAN DEFAULT true,
    "sipol_token" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."processo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "protocolo" TEXT NOT NULL,
    "protocolo_digitos" TEXT NOT NULL,
    "id_procedimento" TEXT,
    "tipo_procedimento_id" TEXT,
    "tipo_procedimento_nome" TEXT,
    "especificacao" TEXT,
    "data_autuacao" DATE,
    "nivel_acesso_global" SMALLINT,
    "link_acesso" TEXT,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "unidades_abertas" JSONB NOT NULL DEFAULT '[]',
    "ultimo_andamento_id" TEXT,
    "ultimo_andamento_em" TIMESTAMPTZ(6),
    "ultimo_andamento_texto" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "rotulo" TEXT,
    "observacao_interna" TEXT,
    "sincronizado_em" TIMESTAMPTZ(6),
    "proxima_sincronizacao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "falhas_consecutivas" INTEGER NOT NULL DEFAULT 0,
    "ultimo_erro" TEXT,
    "ultimo_erro_tipo" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."andamento" (
    "id" BIGSERIAL NOT NULL,
    "processo_id" UUID NOT NULL,
    "id_andamento" TEXT NOT NULL,
    "id_tarefa" TEXT,
    "descricao" TEXT NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL,
    "unidade_id" TEXT,
    "unidade_sigla" TEXT,
    "unidade_nome" TEXT,
    "usuario_sigla" TEXT,
    "usuario_nome" TEXT,
    "atributos" JSONB NOT NULL DEFAULT '{}',
    "registrado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "andamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evento" (
    "id" BIGSERIAL NOT NULL,
    "processo_id" UUID NOT NULL,
    "tipo" "public"."evento_tipo" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado_em" TIMESTAMPTZ(6),

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sync_log" (
    "id" BIGSERIAL NOT NULL,
    "processo_id" UUID,
    "iniciado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duracao_ms" INTEGER,
    "sucesso" BOOLEAN NOT NULL,
    "andamentos_novos" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "erro_tipo" TEXT,

    CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sei_unidade" (
    "id_unidade" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "descricao" TEXT,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sei_unidade_pkey" PRIMARY KEY ("id_unidade")
);

-- CreateTable
CREATE TABLE "public"."sei_tipo_procedimento" (
    "id_tipo_procedimento" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sei_tipo_procedimento_pkey" PRIMARY KEY ("id_tipo_procedimento")
);

-- CreateIndex
CREATE UNIQUE INDEX "processo_protocolo_key" ON "public"."processo"("protocolo");

-- CreateIndex
CREATE INDEX "processo_digitos_idx" ON "public"."processo"("protocolo_digitos");

-- CreateIndex
CREATE INDEX "processo_fila_idx" ON "public"."processo"("proxima_sincronizacao");

-- CreateIndex
CREATE INDEX "andamento_timeline_idx" ON "public"."andamento"("processo_id", "ocorrido_em" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "andamento_unico" ON "public"."andamento"("processo_id", "id_andamento");

-- CreateIndex
CREATE INDEX "evento_pendente_idx" ON "public"."evento"("criado_em");

-- CreateIndex
CREATE INDEX "sync_log_processo_idx" ON "public"."sync_log"("processo_id", "iniciado_em" DESC);

-- AddForeignKey
ALTER TABLE "public"."andamento" ADD CONSTRAINT "andamento_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evento" ADD CONSTRAINT "evento_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sync_log" ADD CONSTRAINT "sync_log_processo_id_fkey" FOREIGN KEY ("processo_id") REFERENCES "public"."processo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
