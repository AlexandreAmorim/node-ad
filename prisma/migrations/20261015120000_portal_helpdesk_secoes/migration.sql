-- CreateEnum
CREATE TYPE "chamado_status" AS ENUM ('novo', 'em_atendimento', 'aguardando_solicitante', 'resolvido', 'fechado', 'cancelado');

-- CreateEnum
CREATE TYPE "chamado_prioridade" AS ENUM ('baixa', 'media', 'alta', 'urgente');

-- CreateTable
CREATE TABLE "secao_ad_map" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ou_codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "sei_id_unidade" TEXT,
    "sei_sigla" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secao_ad_map_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "parent_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chamado" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "status" "chamado_status" NOT NULL DEFAULT 'novo',
    "prioridade" "chamado_prioridade" NOT NULL DEFAULT 'media',
    "solicitante_username" TEXT NOT NULL,
    "solicitante_nome" TEXT,
    "atendente_username" TEXT,
    "atendente_nome" TEXT,
    "secao_id" UUID,
    "ou_codigo" TEXT,
    "categoria_id" UUID,
    "prazo_resposta_em" TIMESTAMPTZ(6),
    "prazo_solucao_em" TIMESTAMPTZ(6),
    "resolvido_em" TIMESTAMPTZ(6),
    "fechado_em" TIMESTAMPTZ(6),
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chamado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chamado_comentario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chamado_id" UUID NOT NULL,
    "autor_username" TEXT NOT NULL,
    "autor_nome" TEXT,
    "texto" TEXT NOT NULL,
    "interno" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chamado_comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chamado_historico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "chamado_id" UUID NOT NULL,
    "autor_username" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chamado_historico_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "secao_ad_map_ou_codigo_key" ON "secao_ad_map"("ou_codigo");

-- CreateIndex
CREATE UNIQUE INDEX "chamado_numero_key" ON "chamado"("numero");

-- CreateIndex
CREATE INDEX "chamado_solicitante_idx" ON "chamado"("solicitante_username");

-- CreateIndex
CREATE INDEX "chamado_atendente_idx" ON "chamado"("atendente_username");

-- CreateIndex
CREATE INDEX "chamado_status_idx" ON "chamado"("status");

-- CreateIndex
CREATE INDEX "chamado_ou_idx" ON "chamado"("ou_codigo");

-- CreateIndex
CREATE INDEX "chamado_comentario_idx" ON "chamado_comentario"("chamado_id", "criado_em");

-- CreateIndex
CREATE INDEX "chamado_historico_idx" ON "chamado_historico"("chamado_id", "criado_em");

-- AddForeignKey
ALTER TABLE "categoria" ADD CONSTRAINT "categoria_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamado" ADD CONSTRAINT "chamado_secao_id_fkey" FOREIGN KEY ("secao_id") REFERENCES "secao_ad_map"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamado" ADD CONSTRAINT "chamado_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamado_comentario" ADD CONSTRAINT "chamado_comentario_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES "chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chamado_historico" ADD CONSTRAINT "chamado_historico_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES "chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
