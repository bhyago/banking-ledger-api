import { ulid } from 'ulid';

export class UniqueEntityID {
  private value: string;

  toString() {
    return this.value;
  }

  toValue() {
    return this.value;
  }

  constructor(value?: string) {
    this.value = value ?? ulid();
  }

  public equals(id: UniqueEntityID) {
    return id.toValue() === this.value;
  }
}
