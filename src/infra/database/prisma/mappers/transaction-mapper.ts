import { Prisma, Transaction as PrismaTx } from '@prisma/client';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { Transaction } from '@/modules/transaction/entities/transaction';

export class PrismaTransactionMapper {
  static toDomain(row: PrismaTx): Transaction {
    return new (Transaction as any)(
      {
        accountId: new UniqueEntityID(row.accountId),
        type: row.type,
        amount: Number(row.amountCents) / 100,
        fee: Number(row.feeCents) / 100,
        description: row.description ?? undefined,
        relatedAccountId: row.relatedAccountId
          ? new UniqueEntityID(row.relatedAccountId)
          : undefined,
        status: row.status,
        transferId: row.transferId
          ? new UniqueEntityID(row.transferId)
          : undefined,
        createdAt: row.createdAt,
      },
      new UniqueEntityID(row.id),
    );
  }

  static toPrisma(entity: Transaction): Prisma.TransactionUncheckedCreateInput {
    return {
      accountId: entity.accountId.toValue(),
      type: entity.type as any,
      amountCents: BigInt(Math.round(entity.amount * 100)),
      feeCents: BigInt(Math.round(entity.fee * 100)),
      description: entity.description ?? null,
      relatedAccountId: entity.relatedAccountId?.toValue() ?? null,
      status: entity.status as any,
      transferId: entity.transferId?.toValue() ?? null,
      createdAt: entity.createdAt,
    };
  }
}
