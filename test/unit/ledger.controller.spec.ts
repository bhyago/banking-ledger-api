import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { LedgerController } from '@/modules/ledger/ledger.controller';
import { GetAccountLedgerUseCase } from '@/modules/ledger/usecases/get-account-ledger';
import { getAccountLedgerDTO } from '@/modules/ledger/dtos/get-account-ledger';
import { ULID } from 'test/ids';

describe('LedgerController (Unit)', () => {
  let controller: LedgerController;
  let getLedgerUC: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    getLedgerUC = { execute: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [LedgerController],
      providers: [{ provide: GetAccountLedgerUseCase, useValue: getLedgerUC }],
    }).compile();

    controller = moduleRef.get(LedgerController);
  });

  test('getLedger forwards params + query and returns output', async () => {
    const param: getAccountLedgerDTO.GetAccountLedgerParamDTO = {
      accountId: ULID.ACC4,
    } as any;
    const query: getAccountLedgerDTO.GetAccountLedgerQueryDTO = {
      page: 2,
      perPage: 10,
      order: 'desc',
    } as any;

    const output: getAccountLedgerDTO.GetAccountLedgerOutput = {
      accountId: ULID.ACC4,
      ledger: [
        {
          id: ULID.TX1,
          description: 'Teste',
          amount: 100,
          balanceAfterCents: 100,
          createdAt: new Date(),
          type: 'credit',
          transactionId: ULID.TX2,
          transferId: null,
          currency: 'BRL',
        },
      ],
      meta: {
        page: 2,
        perPage: 10,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrevious: true,
        order: 'desc',
      },
    } as any;

    getLedgerUC.execute.mockResolvedValueOnce(output);

    const res = await controller.getLedger(param, query);

    expect(getLedgerUC.execute).toHaveBeenCalledWith({
      accountId: ULID.ACC4,
      page: 2,
      perPage: 10,
      order: 'desc',
    });
    expect(res).toEqual(output);
  });
});
