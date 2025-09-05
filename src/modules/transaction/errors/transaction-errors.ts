export namespace transactionErrors {
  export class InsufficientFundsConsideringCreditLimitError extends Error {
    constructor() {
      super('Insufficient funds considering credit limit');
      this.name = 'INSUFFICIENT_FUNDS_CONSIDERING_CREDIT_LIMIT';
    }
  }
}
