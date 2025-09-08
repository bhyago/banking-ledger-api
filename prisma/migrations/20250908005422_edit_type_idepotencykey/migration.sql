/*
  Warnings:

  - The `idempotency_key` column on the `transaction` table will be dropped and recreated as UUID. This will lead to data loss if there is data in the column.
  - The `idempotency_key` on the `transfer` table will be dropped and recreated as UUID (required). Ensure data is compatible before applying in production.
*/

-- Drop old indexes if they exist (will be removed automatically when dropping columns, but safe to ensure clean state)
DROP INDEX IF EXISTS "public"."uniq_tx_type_idemp";
DROP INDEX IF EXISTS "public"."transfer_idempotency_key_key";

-- Alter transaction.idempotency_key to UUID
ALTER TABLE "public"."transaction"
  DROP COLUMN "idempotency_key";
ALTER TABLE "public"."transaction"
  ADD COLUMN "idempotency_key" UUID;

-- Alter transfer.idempotency_key to UUID (required)
ALTER TABLE "public"."transfer"
  DROP COLUMN "idempotency_key";
ALTER TABLE "public"."transfer"
  ADD COLUMN "idempotency_key" UUID NOT NULL;

-- Recreate unique indexes with the expected names from the Prisma schema
CREATE UNIQUE INDEX "uniq_tx_type_idemp" ON "public"."transaction" ("type", "idempotency_key");
CREATE UNIQUE INDEX "transfer_idempotency_key_key" ON "public"."transfer" ("idempotency_key");
