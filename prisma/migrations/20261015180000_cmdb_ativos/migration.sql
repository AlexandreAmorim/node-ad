-- CreateEnum
CREATE TYPE "ativo_tipo" AS ENUM ('computador', 'monitor', 'impressora', 'rede', 'telefone', 'periferico', 'software', 'outro');

-- CreateEnum
CREATE TYPE "ativo_status" AS ENUM ('em_estoque', 'em_uso', 'em_manutencao', 'reservado', 'descartado');

-- CreateTable
CREATE TABLE "fabricante" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "site" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fabricante_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fabricante_nome_key" ON "fabricante"("nome");

-- CreateTable
CREATE TABLE "modelo_ativo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "tipo" "ativo_tipo" NOT NULL DEFAULT 'computador',
    "fabricante_id" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "modelo_ativo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "modelo_ativo_fabricante_id_nome_tipo_key" ON "modelo_ativo"("fabricante_id", "nome", "tipo");

-- CreateTable
CREATE TABLE "localizacao" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "parent_id" UUID,
    "endereco" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "localizacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "localizacao_codigo_key" ON "localizacao"("codigo");

-- CreateTable
CREATE TABLE "fornecedor" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "contato" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fornecedor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fornecedor_nome_key" ON "fornecedor"("nome");

-- CreateTable
CREATE TABLE "ativo" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "numero" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "ativo_tipo" NOT NULL DEFAULT 'computador',
    "status" "ativo_status" NOT NULL DEFAULT 'em_estoque',
    "numero_serie" TEXT,
    "numero_patrimonio" TEXT,
    "numero_inventario" TEXT,
    "fabricante_id" UUID,
    "modelo_id" UUID,
    "localizacao_id" UUID,
    "fornecedor_id" UUID,
    "usuario_username" TEXT,
    "usuario_nome" TEXT,
    "ou_codigo" TEXT,
    "data_aquisicao" DATE,
    "data_garantia" DATE,
    "valor" DECIMAL(12,2),
    "observacao" TEXT,
    "specs" JSONB NOT NULL DEFAULT '{}',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ativo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ativo_numero_key" ON "ativo"("numero");
CREATE UNIQUE INDEX "ativo_numero_patrimonio_key" ON "ativo"("numero_patrimonio");
CREATE INDEX "ativo_tipo_idx" ON "ativo"("tipo");
CREATE INDEX "ativo_status_idx" ON "ativo"("status");
CREATE INDEX "ativo_usuario_idx" ON "ativo"("usuario_username");
CREATE INDEX "ativo_ou_idx" ON "ativo"("ou_codigo");
CREATE INDEX "ativo_serie_idx" ON "ativo"("numero_serie");

-- CreateTable
CREATE TABLE "ativo_historico" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ativo_id" UUID NOT NULL,
    "autor_username" TEXT NOT NULL,
    "campo" TEXT NOT NULL,
    "valor_anterior" TEXT,
    "valor_novo" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ativo_historico_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ativo_historico_idx" ON "ativo_historico"("ativo_id", "criado_em");

-- CreateTable
CREATE TABLE "chamado_ativo" (
    "chamado_id" UUID NOT NULL,
    "ativo_id" UUID NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chamado_ativo_pkey" PRIMARY KEY ("chamado_id","ativo_id")
);

-- FKs
ALTER TABLE "modelo_ativo" ADD CONSTRAINT "modelo_ativo_fabricante_id_fkey" FOREIGN KEY ("fabricante_id") REFERENCES "fabricante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "localizacao" ADD CONSTRAINT "localizacao_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "localizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_fabricante_id_fkey" FOREIGN KEY ("fabricante_id") REFERENCES "fabricante"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_modelo_id_fkey" FOREIGN KEY ("modelo_id") REFERENCES "modelo_ativo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_localizacao_id_fkey" FOREIGN KEY ("localizacao_id") REFERENCES "localizacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ativo" ADD CONSTRAINT "ativo_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ativo_historico" ADD CONSTRAINT "ativo_historico_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chamado_ativo" ADD CONSTRAINT "chamado_ativo_chamado_id_fkey" FOREIGN KEY ("chamado_id") REFERENCES "chamado"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chamado_ativo" ADD CONSTRAINT "chamado_ativo_ativo_id_fkey" FOREIGN KEY ("ativo_id") REFERENCES "ativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
