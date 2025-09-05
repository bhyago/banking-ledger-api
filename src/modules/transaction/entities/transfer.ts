import { Entity } from '@/common/entities/entity';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { DateTime } from 'luxon';
import { TransferStatus } from './enums';

export interface TransferProps {
  fromAccountId: UniqueEntityID;
  toAccountId: UniqueEntityID;
  amount: number;
  feeFrom: number;
  status: TransferStatus;
  createdAt: Date;
}

export class Transfer extends Entity<TransferProps> {
  static create(
    props: Omit<TransferProps, 'status' | 'feeFrom' | 'createdAt'> & {
      feeFrom?: number;
    },
    id?: UniqueEntityID,
  ) {
    const now = DateTime.utc().toJSDate();
    return new Transfer(
      {
        ...props,
        status: TransferStatus.APPLIED,
        feeFrom: props.feeFrom ?? 0,
        createdAt: now,
      },
      id,
    );
  }

  get fromAccountId(): UniqueEntityID {
    return this.props.fromAccountId;
  }
  get toAccountId(): UniqueEntityID {
    return this.props.toAccountId;
  }
  get amount(): number {
    return this.props.amount;
  }
  get feeFrom(): number {
    return this.props.feeFrom;
  }
  get status(): TransferStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
