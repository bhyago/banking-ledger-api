import { Test } from '@nestjs/testing';
import { DepositUseCase } from '@/modules/transaction/usecases/deposit';
import { WithdrawUseCase } from '@/modules/transaction/usecases/withdraw';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';
import { ProcessBatchAccountTransactionsUseCase } from '@/modules/transaction/usecases/process-batch-account-transactions';
import { ProcessBatchTransfersUseCase } from '@/modules/transaction/usecases/process-batch-transfers';

class FakeTxService {
  async deposit(input: any) {
    return {
      transactionId: `tx-${input.accountId}-${input.amount}`,
      accountId: input.accountId,
      newBalance: 100 + input.amount,
    };
  }
  async withdraw(input: any) {
    return {
      transactionId: `txw-${input.accountId}-${input.amount}`,
      accountId: input.accountId,
      newBalance: 100 - input.amount,
      feeApplied: 0,
    };
  }
  async transfer(input: any) {
    return {
      transferId: `tr-${input.fromAccountId}-${input.toAccountId}-${input.amount}`,
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      fromNewBalance: 100 - input.amount,
      toNewBalance: 100 + input.amount,
      feeApplied: 0,
    };
  }
}

describe('Usecases batch execution', () => {
  it('DepositUseCase processa lotes e retorna array', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DepositUseCase,
        { provide: AccountTransactionService, useClass: FakeTxService },
        {
          provide: ProcessBatchAccountTransactionsUseCase,
          useValue: {
            execute: async (input: any) => ({
              accountId: input.accountId,
              applied: input.items.length,
              finalBalance: 0,
              results: input.items.map((it: any, idx: number) => ({
                type: 'DEPOSIT',
                transactionId: `tx-${idx}`,
                accountId: input.accountId,
                newBalance: 100 + it.amount,
              })),
            }),
          },
        },
        {
          provide: ProcessBatchTransfersUseCase,
          useValue: { execute: async () => ({}) },
        },
      ],
    }).compile();

    const uc = moduleRef.get(DepositUseCase);
    const out = await uc.execute([
      { accountId: 'A', amount: 1 },
      { accountId: 'B', amount: 2 },
    ] as any);
    expect(Array.isArray(out)).toBeTruthy();
    expect(out as any[]).toHaveLength(2);
  });

  it('WithdrawUseCase processa lotes e retorna array', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        WithdrawUseCase,
        { provide: AccountTransactionService, useClass: FakeTxService },
        {
          provide: ProcessBatchAccountTransactionsUseCase,
          useValue: {
            execute: async (input: any) => ({
              accountId: input.accountId,
              applied: input.items.length,
              finalBalance: 0,
              results: input.items.map((it: any, idx: number) => ({
                type: 'WITHDRAW',
                transactionId: `txw-${idx}`,
                accountId: input.accountId,
                newBalance: 100 - it.amount,
                feeApplied: 0,
              })),
            }),
          },
        },
        {
          provide: ProcessBatchTransfersUseCase,
          useValue: { execute: async () => ({}) },
        },
      ],
    }).compile();

    const uc = moduleRef.get(WithdrawUseCase);
    const out = await uc.execute([
      { accountId: 'A', amount: 1 },
      { accountId: 'B', amount: 2 },
    ] as any);
    expect(Array.isArray(out)).toBeTruthy();
    expect(out as any[]).toHaveLength(2);
  });

  it('TransferUseCase processa lotes e retorna array', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        TransferUseCase,
        { provide: AccountTransactionService, useClass: FakeTxService },
        {
          provide: ProcessBatchAccountTransactionsUseCase,
          useValue: { execute: async () => ({}) },
        },
        {
          provide: ProcessBatchTransfersUseCase,
          useValue: {
            execute: async (input: any) => ({
              fromAccountId: input.fromAccountId,
              toAccountId: input.toAccountId,
              applied: input.items.length,
              results: input.items.map((it: any, idx: number) => ({
                transferId: `tr-${idx}`,
                fromAccountId: input.fromAccountId,
                toAccountId: input.toAccountId,
                fromNewBalance: 100 - it.amount,
                toNewBalance: 100 + it.amount,
                feeApplied: 0,
              })),
            }),
          },
        },
      ],
    }).compile();

    const uc = moduleRef.get(TransferUseCase);
    const out = await uc.execute([
      { fromAccountId: 'A', toAccountId: 'B', amount: 1 },
      { fromAccountId: 'C', toAccountId: 'D', amount: 2 },
    ] as any);
    expect(Array.isArray(out)).toBeTruthy();
    expect(out as any[]).toHaveLength(2);
  });
});
