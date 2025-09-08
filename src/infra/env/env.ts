import { z } from 'zod';

export const envSchema = z.object({
  PORT: z.coerce.number().optional().default(3333),
  DATABASE_URL: z.string().url(),
  QUEUE_SERVER_URL: z.string().optional().default('amqp://localhost:5672'),
  RABBITMQ_REQUEUE_ON_FAIL: z.coerce.boolean().optional().default(false),
  TX_BATCH_SIZE: z.coerce.number().optional().default(100),
  TX_BATCH_WINDOW_MS: z.coerce.number().optional().default(200),
  RABBITMQ_DEPOSIT_QUEUE: z.string().optional().default('tx-deposits'),
  RABBITMQ_WITHDRAW_QUEUE: z.string().optional().default('tx-withdrawals'),
  RABBITMQ_TRANSFER_QUEUE: z.string().optional().default('tx-transfers'),
});

export type Env = z.infer<typeof envSchema>;
