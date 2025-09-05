import { Injectable } from '@nestjs/common';
import { depositDTO } from '../dtos/deposit';
import { AccountTransactionService } from '../services/account-transaction.service';

@Injectable()
export class DepositUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  async execute(input: depositDTO.Input): Promise<depositDTO.Output> {
    const result = await this.txService.deposit({ ...input });
    return {
      transactionId: result.transactionId,
      accountId: result.accountId,
      newBalance: result.newBalance,
    };
  }
}
