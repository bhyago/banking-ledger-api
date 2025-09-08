export namespace accountErrors {
  export class AccountNotFoundError extends Error {
    constructor() {
      super('Account not found');
      this.name = 'ACCOUNT_NOT_FOUND';
    }
  }

  export class CPFInUseForActiveAccountError extends Error {
    constructor() {
      super('CPF already in use for an active account');
      this.name = 'CPF_IN_USE';
    }
  }

  export class InvalidCPFError extends Error {
    constructor() {
      super('Invalid CPF');
      this.name = 'INVALID_CPF';
    }
  }
}
