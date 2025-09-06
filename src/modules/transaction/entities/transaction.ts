import { Entity } from '@/common/entities/entity';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { DateTime } from 'luxon';
import { TransactionStatus, TransactionType } from './enums';

export interface TransactionProps {
  accountId: UniqueEntityID;
  type: TransactionType;
  amount: number;
  fee: number;
  description?: string;
  relatedAccountId?: UniqueEntityID;
  status: TransactionStatus;
  transferId?: UniqueEntityID;
  idempotencyKey?: string;
  createdAt: Date;
}

export class Transaction extends Entity<TransactionProps> {
  static create(
    props: Omit<TransactionProps, 'createdAt' | 'status' | 'fee'> & {
      fee?: number;
    },
    id?: UniqueEntityID,
  ) {
    const now = DateTime.utc().toJSDate();
    return new Transaction(
      {
        ...props,
        fee: props.fee ?? 0,
        status: TransactionStatus.APPLIED,
        createdAt: now,
      },
      id,
    );
  }

  get accountId(): UniqueEntityID {
    return this.props.accountId;
  }
  get type(): TransactionType {
    return this.props.type;
  }
  get amount(): number {
    return this.props.amount;
  }
  get fee(): number {
    return this.props.fee;
  }
  get description(): string | undefined {
    return this.props.description;
  }
  get relatedAccountId(): UniqueEntityID | undefined {
    return this.props.relatedAccountId;
  }
  get status(): TransactionStatus {
    return this.props.status;
  }
  get transferId(): UniqueEntityID | undefined {
    return this.props.transferId;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get idempotencyKey(): string | undefined {
    return this.props.idempotencyKey;
  }
}
