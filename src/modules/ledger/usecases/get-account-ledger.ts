import { Injectable } from '@nestjs/common';
import { accountErrors } from '@/modules/account/errors/account-errors';
import type { getAccountLedgerDTO } from '../dtos/get-account-ledger';
import { PrismaService } from '@/infra/database/prisma/prisma.service';

@Injectable()
export class GetAccountLedgerUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: getAccountLedgerDTO.GetAccountLedgerInput,
  ): Promise<getAccountLedgerDTO.GetAccountLedgerOutput> {
    const account = await this.prisma.account.findUnique({
      where: { id: input.accountId },
    });
    if (!account) throw new accountErrors.AccountNotFoundError();

    const skip = (input.page - 1) * input.perPage;
    const [total, ledger] = await Promise.all([
      this.prisma.ledgerEntry.count({ where: { accountId: input.accountId } }),
      this.prisma.ledgerEntry.findMany({
        where: { accountId: input.accountId },
        orderBy: { createdAt: input.order },
        skip,
        take: input.perPage,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / input.perPage));
    const hasPrevious = input.page > 1;
    const hasNext = input.page < totalPages;

    return {
      accountId: input.accountId,
      ledger: ledger.map((l) => ({
        id: l.id.toString(),
        description: null,
        amount:
          l.creditCents > BigInt(0)
            ? Number(l.creditCents) / 100
            : Number(l.debitCents) / 100,
        balanceAfterCents: Number(l.balanceAfterCents) / 100,
        createdAt: l.createdAt,
        type: l.creditCents > BigInt(0) ? 'credit' : 'debit',
        transactionId: l.transactionId ?? null,
        transferId: l.transferId ?? null,
        currency: 'BRL',
      })),
      meta: {
        page: input.page,
        perPage: input.perPage,
        total,
        totalPages,
        hasNext,
        hasPrevious,
        order: input.order,
      },
    };
  }
}
