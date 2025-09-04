-- CreateTable
CREATE TABLE "public"."fee_policy" (
    "id" TEXT NOT NULL,
    "transaction_type" "public"."TransactionType" NOT NULL,
    "flat_fee_cents" BIGINT NOT NULL DEFAULT 0,
    "percent_bps" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "fee_policy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_fee_tx_type_range" ON "public"."fee_policy"("transaction_type", "starts_at", "ends_at");
