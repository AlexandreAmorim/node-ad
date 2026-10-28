-- AlterTable
ALTER TABLE "public"."settings" ADD COLUMN     "segov_status" BOOLEAN DEFAULT true,
ADD COLUMN     "segov_token" TEXT;
