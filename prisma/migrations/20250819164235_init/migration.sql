-- CreateTable
CREATE TABLE "public"."settings" (
    "id" SERIAL NOT NULL,
    "sipol_status" BOOLEAN DEFAULT true,
    "sipol_token" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);
