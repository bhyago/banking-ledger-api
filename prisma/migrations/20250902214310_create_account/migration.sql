-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "balance_cents" BIGINT NOT NULL DEFAULT 0,
    "credit_limit_cents" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_number_key" ON "public"."account"("number");

-- CreateIndex
CREATE INDEX "idx_account_id" ON "public"."account"("id");
