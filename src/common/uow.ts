export type UnitOfWorkTx = {};

export interface UnitOfWork {
  run<T>(fn: (tx: UnitOfWorkTx) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
