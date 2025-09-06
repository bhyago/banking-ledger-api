import { Test } from '@nestjs/testing';
import { DepositUseCase } from '@/modules/transaction/usecases/deposit';
import { WithdrawUseCase } from '@/modules/transaction/usecases/withdraw';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { AccountTransactionService } from '@/modules/transaction/services/account-transaction.service';

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
