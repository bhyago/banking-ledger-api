import { Prisma, LedgerEntry as PrismaLedger } from '@prisma/client';
import { LedgerEntry } from '@/modules/transaction/entities/ledger-entry';

export class PrismaLedgerEntryMapper {
  static toPrisma(entity: LedgerEntry): Prisma.LedgerEntryUncheckedCreateInput {
    return {
      accountId: entity.accountId.toValue(),
      transactionId: entity.transactionId?.toValue() ?? null,
      transferId: entity.transferId?.toValue() ?? null,
      debitCents: BigInt(Math.round(entity.debit * 100)),
      creditCents: BigInt(Math.round(entity.credit * 100)),
      balanceAfterCents: BigInt(Math.round(entity.balanceAfter * 100)),
      createdAt: entity.createdAt,
    };
  }
}
