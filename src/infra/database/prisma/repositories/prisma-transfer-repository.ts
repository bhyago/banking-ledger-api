import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { TransferRepository } from '@/modules/transaction/repositories/transfer-repository';
import type { Transfer } from '@/modules/transaction/entities/transfer';
import type { UnitOfWorkTx } from '@/common/uow';
import type { PrismaTxAdapter } from '../prisma-unit-of-work';
import { PrismaTransferMapper } from '../mappers/transfer-mapper';

@Injectable()
export class PrismaTransferRepository implements TransferRepository {
  constructor(private prisma: PrismaService) {}

  async create(input: Transfer, tx?: UnitOfWorkTx): Promise<{ id: string }> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.transfer.create({
      data: PrismaTransferMapper.toPrisma(input),
    });
    return { id: row.id };
  }

  async findByIdempotencyKey(
    input: { idempotencyKey: string },
    tx?: UnitOfWorkTx,
  ): Promise<Transfer | null> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.transfer.findUnique({
      where: {
        idempotencyKey: input.idempotencyKey,
      },
    });
    if (!row) return null;
    return PrismaTransferMapper.toDomain(row);
  }
}
