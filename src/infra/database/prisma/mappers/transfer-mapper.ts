import { Prisma, Transfer as PrismaTransfer } from '@prisma/client';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { Transfer } from '@/modules/transaction/entities/transfer';

export class PrismaTransferMapper {
  static toDomain(row: PrismaTransfer): Transfer {
    return new (Transfer as any)(
      {
        fromAccountId: new UniqueEntityID(row.fromAccountId),
        toAccountId: new UniqueEntityID(row.toAccountId),
        amount: Number(row.amountCents) / 100,
        feeFrom: Number(row.feeFromCents) / 100,
        status: row.status,
        idempotencyKey: row.idempotencyKey,
        createdAt: row.createdAt,
      },
      new UniqueEntityID(row.id),
    );
  }

  static toPrisma(entity: Transfer): Prisma.TransferUncheckedCreateInput {
    return {
      fromAccountId: entity.fromAccountId.toValue(),
      toAccountId: entity.toAccountId.toValue(),
      amountCents: BigInt(Math.round(entity.amount * 100)),
      feeFromCents: BigInt(Math.round(entity.feeFrom * 100)),
      status: entity.status as any,
      idempotencyKey: '',
      createdAt: entity.createdAt,
    };
  }
}
