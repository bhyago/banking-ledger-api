export type DepositMessage = {
  id: string;
  accountId: string;
  amount: number;
  description?: string;
};
export type WithdrawMessage = {
  id: string;
  accountId: string;
  amount: number;
  description?: string;
};
export type TransferMessage = {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  description?: string;
  idempotencyKey?: string;
};

export const QUEUES = {
  deposit: process.env.RABBITMQ_DEPOSIT_QUEUE || 'tx-deposits',
  withdraw: process.env.RABBITMQ_WITHDRAW_QUEUE || 'tx-withdrawals',
  transfer: process.env.RABBITMQ_TRANSFER_QUEUE || 'tx-transfers',
} as const;
