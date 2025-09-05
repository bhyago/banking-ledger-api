export namespace transactionErrors {
  export class InsufficientFundsConsideringCreditLimitError extends Error {
    constructor() {
      super('Insufficient funds considering credit limit');
      this.name = 'INSUFFICIENT_FUNDS_CONSIDERING_CREDIT_LIMIT';
    }
  }

  export class TransferAccountsMustDifferError extends Error {
    constructor() {
      super('fromAccountId and toAccountId must differ');
      this.name = 'TRANSFER_ACCOUNTS_MUST_DIFFER';
    }
  }
}
