import { Entity } from '@/common/entities/entity';
import { UniqueEntityID } from '@/common/entities/unique-entity-id';
import { DateTime } from 'luxon';

export interface AccountProps {
  number: string;
  creditLimit: number;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

function generateAccountNumberFromId(id: UniqueEntityID): number {
  return parseInt(id.toString().slice(-6), 16);
}

export class Account extends Entity<AccountProps> {
  static create(
    props: Omit<
      AccountProps,
      | 'createdAt'
      | 'updatedAt'
      | 'balance'
      | 'creditLimit'
      | 'number'
      | 'deletedAt'
    >,
    id?: UniqueEntityID,
  ) {
    const now = DateTime.utc().toJSDate();
    const account = new Account(
      {
        ...props,
        number: generateAccountNumberFromId(
          id ?? new UniqueEntityID(),
        ).toString(),
        balance: 0,
        creditLimit: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      },
      id,
    );
    return account;
  }
  static restore(props: AccountProps, id: UniqueEntityID) {
    return new Account(props, id);
  }

  private touch() {
    this.props.updatedAt = DateTime.utc().toJSDate();
  }

  get number(): string {
    return this.props.number;
  }

  set number(value: string) {
    this.props.number = value;
    this.touch();
  }

  get creditLimit(): number {
    return this.props.creditLimit;
  }

  set creditLimit(value: number) {
    this.props.creditLimit = value;
    this.touch();
  }

  get balance(): number {
    return this.props.balance;
  }

  set balance(value: number) {
    this.props.balance = value;
    this.touch();
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  set createdAt(value: Date) {
    this.props.createdAt = value;
    this.touch();
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date) {
    this.props.updatedAt = value;
    this.touch();
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  set deletedAt(value: Date | null) {
    this.props.deletedAt = value;
    this.touch();
  }
}
