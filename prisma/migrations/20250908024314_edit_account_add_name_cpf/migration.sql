-- AlterTable
ALTER TABLE "public"."account" ADD COLUMN     "cpf" VARCHAR(11),
ADD COLUMN     "full_name" VARCHAR(120);

-- RenameIndex
ALTER INDEX "public"."uniq_tx_type_idemp" RENAME TO "transaction_type_idempotency_key_key";
