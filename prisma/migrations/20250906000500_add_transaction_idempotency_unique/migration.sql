-- Ensure idempotency support on transaction table
ALTER TABLE "public"."transaction"
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255);

-- Create unique composite on (type, idempotency_key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_tx_type_idemp'
  ) THEN
    CREATE UNIQUE INDEX "uniq_tx_type_idemp" ON "public"."transaction" ("type", "idempotency_key");
  END IF;
END $$;

