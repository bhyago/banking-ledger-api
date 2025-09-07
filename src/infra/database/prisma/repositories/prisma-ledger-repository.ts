import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../prisma.service';
import type { LedgerRepository } from '@/modules/transaction/repositories/ledger-repository';
import type { LedgerEntry } from '@/modules/transaction/entities/ledger-entry';
import { PrismaLedgerEntryMapper } from '../mappers/ledger-entry-mapper';
import type { UnitOfWorkTx } from '@/common/uow';
import type { PrismaTxAdapter } from '../prisma-unit-of-work';

@Injectable()
export class PrismaLedgerRepository implements LedgerRepository {
  constructor(private prisma: PrismaService) {}

  async append(input: LedgerEntry, tx?: UnitOfWorkTx): Promise<{ id: string }> {
    const client = tx ? (tx as PrismaTxAdapter).client : this.prisma;
    const row = await client.ledgerEntry.create({
      data: PrismaLedgerEntryMapper.toPrisma(input),
    });
    return { id: row.id.toString() };
  }
}
