import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LedgerRepository } from '@/modules/transaction/repositories/ledger-repository';
import { LedgerEntry } from '@/modules/transaction/entities/ledger-entry';
import { PrismaLedgerEntryMapper } from '../mappers/ledger-entry-mapper';
import { UnitOfWorkTx } from '@/common/uow';
import { PrismaTxAdapter } from '../prisma-unit-of-work';

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
