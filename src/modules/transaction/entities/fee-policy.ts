import { Entity } from '@/common/entities/entity';
import type { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { DateTime } from 'luxon';
import type { TransactionType } from './enums';

export interface FeePolicyProps {
  transactionType: TransactionType;
  flatFee: number;
  percentBps: number; // 1% = 100 bps
  startsAt: Date;
  endsAt: Date;
}

export class FeePolicy extends Entity<FeePolicyProps> {
  static create(props: FeePolicyProps, id?: UniqueEntityID) {
    return new FeePolicy(props, id);
  }

  get transactionType() {
    return this.props.transactionType;
  }
  get flatFee() {
    return this.props.flatFee;
  }
  get percentBps() {
    return this.props.percentBps;
  }
  get startsAt() {
    return this.props.startsAt;
  }
  get endsAt() {
    return this.props.endsAt;
  }

  isActive(at: Date = DateTime.utc().toJSDate()) {
    return this.startsAt <= at && at <= this.endsAt;
  }

  calculate(amount: number): number {
    const percent = (amount * this.percentBps) / 10_000;
    return this.flatFee + percent;
  }
}
