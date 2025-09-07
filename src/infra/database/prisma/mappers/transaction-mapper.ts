import type { Prisma, Transaction as PrismaTx } from '@prisma/client';
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
    const data: any = {
      id: entity.id.toValue(),
      accountId: entity.accountId.toValue(),
      type: entity.type,
      amountCents: BigInt(Math.round(entity.amount * 100)),
      feeCents: BigInt(Math.round(entity.fee * 100)),
      description: entity.description ?? null,
      relatedAccountId: entity.relatedAccountId?.toValue() ?? null,
      status: entity.status,
      transferId: entity.transferId?.toValue() ?? null,
      createdAt: entity.createdAt,
    };
    // Optional field for newer schema versions
    if (typeof entity.idempotencyKey !== 'undefined') {
      data.idempotencyKey = entity.idempotencyKey ?? null;
    }
    return data as Prisma.TransactionUncheckedCreateInput;
  }
}
