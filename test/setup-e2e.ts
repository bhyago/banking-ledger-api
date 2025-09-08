import 'reflect-metadata';
import { config as dotenvConfig } from 'dotenv';

// Load test-specific env file (falls back to process.env if not found)
dotenvConfig({ path: '.env.test' });

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';

// Ensure predictable queue names in tests (overridable via .env.test)
process.env.RABBITMQ_DEPOSIT_QUEUE =
  process.env.RABBITMQ_DEPOSIT_QUEUE ?? 'tx-deposits';
process.env.RABBITMQ_WITHDRAW_QUEUE =
  process.env.RABBITMQ_WITHDRAW_QUEUE ?? 'tx-withdrawals';
process.env.RABBITMQ_TRANSFER_QUEUE =
  process.env.RABBITMQ_TRANSFER_QUEUE ?? 'tx-transfers';
// Force queue fakes in tests
process.env.QUEUE_FAKE = process.env.QUEUE_FAKE ?? 'true';
