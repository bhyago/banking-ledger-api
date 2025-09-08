import { PrismaClient, TransactionType } from '@prisma/client';
import { ulid } from 'ulid';

const prisma = new PrismaClient();

async function main() {
  // Basic seed: a few accounts with initial balances/limits
  const now = new Date();
  const accounts = [
    {
      number: '100001',
      fullName: 'Alice Example',
      cpf: '12345678901',
      balanceCents: 100_00n,
      creditLimitCents: 0n,
    },
    {
      number: '100002',
      fullName: 'Bob Example',
      cpf: '98765432100',
      balanceCents: 500_00n,
      creditLimitCents: 200_00n,
    },
    {
      number: '100003',
      fullName: 'Carol Example',
      cpf: '11122233344',
      balanceCents: 0n,
      creditLimitCents: 1_000_00n,
    },
  ];

  for (const a of accounts) {
    await prisma.account.upsert({
      // Use unique account number for idempotency
      where: { number: a.number },
      update: {
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        fullName: a.fullName,
        cpf: a.cpf,
      },
      create: {
        id: ulid(),
        number: a.number,
        fullName: a.fullName,
        cpf: a.cpf,
        balanceCents: a.balanceCents,
        creditLimitCents: a.creditLimitCents,
        createdAt: now,
      },
    });
  }

  // Seed Fee Policies (valid for a long window)
  const startsAt = new Date(now.getFullYear() - 10, 0, 1);
  const endsAt = new Date(now.getFullYear() + 10, 11, 31);

  // Withdraw: flat 2.00, no percent
  // Ensure a single default withdraw policy exists, with ULID id
  await prisma.feePolicy.deleteMany({
    where: { transactionType: TransactionType.WITHDRAW },
  });
  await prisma.feePolicy.create({
    data: {
      id: ulid(),
      transactionType: TransactionType.WITHDRAW,
      flatFeeCents: 200n,
      percentBps: 0,
      startsAt,
      endsAt,
    },
  });

  // Transfer: flat 1.00 + 0.5%
  // Ensure a single default transfer policy exists, with ULID id
  await prisma.feePolicy.deleteMany({
    where: { transactionType: TransactionType.TRANSFER },
  });
  await prisma.feePolicy.create({
    data: {
      id: ulid(),
      transactionType: TransactionType.TRANSFER,
      flatFeeCents: 100n,
      percentBps: 50,
      startsAt,
      endsAt,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
