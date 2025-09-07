import { FeePolicy } from '@/modules/transaction/entities/fee-policy';
import { Prisma, type FeePolicy as PrismaFee } from '@prisma/client';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';

export class PrismaFeePolicyMapper {
  static toDomain(row: PrismaFee): FeePolicy {
    return new (FeePolicy as any)(
      {
        transactionType: row.transactionType,
        flatFee: Number(row.flatFeeCents) / 100,
        percentBps: row.percentBps,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
      },
      new UniqueEntityID(row.id),
    );
  }
}
