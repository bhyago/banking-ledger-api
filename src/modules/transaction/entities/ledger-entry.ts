import { Entity } from '@/common/entities/entity';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { DateTime } from 'luxon';

export interface LedgerEntryProps {
  accountId: UniqueEntityID;
  transactionId?: UniqueEntityID | null;
  transferId?: UniqueEntityID | null;
  debit: number;
  credit: number;
  balanceAfter: number;
  createdAt: Date;
}

export class LedgerEntry extends Entity<LedgerEntryProps> {
  static create(
    props: Omit<LedgerEntryProps, 'createdAt'>,
    id?: UniqueEntityID,
  ) {
    const now = DateTime.utc().toJSDate();
    return new LedgerEntry({ ...props, createdAt: now }, id);
  }

  get accountId(): UniqueEntityID {
    return this.props.accountId;
  }
  get transactionId(): UniqueEntityID | null {
    return this.props.transactionId ?? null;
  }
  get transferId(): UniqueEntityID | null {
    return this.props.transferId ?? null;
  }
  get debit(): number {
    return this.props.debit;
  }
  get credit(): number {
    return this.props.credit;
  }
  get balanceAfter(): number {
    return this.props.balanceAfter;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
