import type { LedgerEntry } from '../entities/ledger-entry';
import type { UnitOfWorkTx } from '@/common/uow';

export abstract class LedgerRepository {
  abstract append(
    input: LedgerEntry,
    tx?: UnitOfWorkTx,
  ): Promise<{ id: string }>;
}
