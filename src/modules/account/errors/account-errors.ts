export namespace accountErrors {
  export class AccountNotFoundError extends Error {
    constructor() {
      super('Account not found');
      this.name = 'ACCOUNT_NOT_FOUND';
    }
  }
}
