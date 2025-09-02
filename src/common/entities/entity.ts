import { UniqueEntityID } from './unique-entity-id';

export abstract class Entity<Props> {
  private _id: number | undefined;
  private _externalId: UniqueEntityID;
  protected props: Props;

  get id() {
    return this._id;
  }

  get externalId() {
    return this._externalId;
  }

  protected constructor(
    props: Props,
    externalId?: UniqueEntityID,
    id?: number,
  ) {
    this.props = props;
    this._id = id ?? undefined;
    this._externalId = externalId ?? new UniqueEntityID();
  }

  public equalsId(entity: Entity<unknown>) {
    if (entity === this) {
      return true;
    }

    if (entity.id === this._id) {
      return true;
    }

    return false;
  }

  public equalsExternalId(entity: Entity<unknown>) {
    if (entity === this) {
      return true;
    }

    if (entity.externalId === this._externalId) {
      return true;
    }

    return false;
  }
}
