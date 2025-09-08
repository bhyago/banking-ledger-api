-- CreateEnum
CREATE TYPE "public"."TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER');

-- CreateEnum
CREATE TYPE "public"."TransactionStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."TransferStatus" AS ENUM ('PENDING', 'APPLIED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."ledger_entry" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "transfer_id" TEXT,
    "debit_cents" BIGINT NOT NULL DEFAULT 0,
    "credit_cents" BIGINT NOT NULL DEFAULT 0,
    "balance_after_cents" BIGINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transaction" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "type" "public"."TransactionType" NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "fee_cents" BIGINT NOT NULL DEFAULT 0,
    "description" VARCHAR(280),
    "related_account_id" TEXT,
    "status" "public"."TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "transfer_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."transfer" (
    "id" TEXT NOT NULL,
    "from_account_id" TEXT NOT NULL,
    "to_account_id" TEXT NOT NULL,
    "amount_cents" BIGINT NOT NULL,
    "fee_from_cents" BIGINT NOT NULL DEFAULT 0,
    "status" "public"."TransferStatus" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_ledger_account_created_at" ON "public"."ledger_entry"("account_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_tx_account_created_at_desc" ON "public"."transaction"("account_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "transfer_idempotency_key_key" ON "public"."transfer"("idempotency_key");

-- AddForeignKey
ALTER TABLE "public"."ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entry" ADD CONSTRAINT "ledger_entry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entry" ADD CONSTRAINT "ledger_entry_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."transfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transaction" ADD CONSTRAINT "transaction_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfer" ADD CONSTRAINT "transfer_from_account_id_fkey" FOREIGN KEY ("from_account_id") REFERENCES "public"."account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."transfer" ADD CONSTRAINT "transfer_to_account_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "public"."account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
