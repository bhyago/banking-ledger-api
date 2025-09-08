import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';
import { TransferUseCase } from '@/modules/transaction/usecases/transfer';
import { ConsumeMessageFromQueueProvider } from '@/contracts/rabbit-mq/consume-message-from-queue';
import { SendMessageToQueueProvider } from '@/contracts/rabbit-mq/send-message-to-queue';
import { FakeConsumeQueue, FakeSendQueue } from '../../fakes/fake-queue';
import { transactionErrors } from '@/modules/transaction/errors/transaction-errors';
import { randomUUID } from 'crypto';
import { ULID } from 'test/ids';

describe('Transfer Integration DB (UseCase + Prisma)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let usecase: TransferUseCase;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConsumeMessageFromQueueProvider)
      .useClass(FakeConsumeQueue)
      .overrideProvider(SendMessageToQueueProvider)
      .useClass(FakeSendQueue)
      .compile();

    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    usecase = moduleRef.get(TransferUseCase);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serializes two transfers from same account (DB-backed)', async () => {
    const fromId = ULID.ACC1;
    const to1Id = ULID.ACC2;
    const to2Id = ULID.ACC3;
    const now = new Date();
    // Ensure accounts exist with desired balances
    await prisma.account.upsert({
      where: { id: fromId },
      update: { balanceCents: 100_00n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: fromId,
        number: fromId.slice(-6),
        balanceCents: 100_00n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.upsert({
      where: { id: to1Id },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: to1Id,
        number: to1Id.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.account.upsert({
      where: { id: to2Id },
      update: { balanceCents: 0n, creditLimitCents: 0n, updatedAt: now },
      create: {
        id: to2Id,
        number: to2Id.slice(-6),
        balanceCents: 0n,
        creditLimitCents: 0n,
        createdAt: now,
        updatedAt: now,
      },
    });

    const acc = await prisma.account.findUnique({ where: { id: fromId } });
    expect(acc).not.toBeNull();
    expect(Number(acc!.balanceCents)).toBe(10000);

    const key1 = randomUUID();
    const key2 = randomUUID();
    const p1 = usecase.execute({
      id: 'intdb-1',
      fromAccountId: fromId,
      toAccountId: to1Id,
      amount: 70,
      description: 'db1',
      idempotencyKey: key1,
    } as any);
    await expect(p1).resolves.toBeTruthy();
    await expect(
      usecase.execute({
        id: 'intdb-2',
        fromAccountId: fromId,
        toAccountId: to2Id,
        amount: 70,
        description: 'db2',
        idempotencyKey: key2,
      } as any),
    ).rejects.toBeInstanceOf(
      transactionErrors.InsufficientFundsConsideringCreditLimitError,
    );

    const from = await prisma.account.findUnique({ where: { id: fromId } });
    const to1 = await prisma.account.findUnique({ where: { id: to1Id } });
    const to2 = await prisma.account.findUnique({ where: { id: to2Id } });
    // With fee policy (flat 1.00 + 0.5%), total debit = 70.00 + 1.35 = 71.35
    expect(Number(from!.balanceCents)).toBe(2865);
    // Exactly one destination credited +7000 cents
    const credits = [Number(to1!.balanceCents), Number(to2!.balanceCents)];
    expect(credits).toEqual(expect.arrayContaining([7000, 0]));
  });
});
