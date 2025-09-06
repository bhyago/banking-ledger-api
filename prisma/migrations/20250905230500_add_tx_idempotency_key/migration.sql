ALTER TABLE "transaction" ADD COLUMN IF NOT EXISTS idempotency_key varchar(255);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tx_type_idemp ON "transaction" (type, idempotency_key) WHERE idempotency_key IS NOT NULL;

