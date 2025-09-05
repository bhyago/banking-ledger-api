import { Injectable } from '@nestjs/common';
import { AccountTransactionService } from '../services/account-transaction.service';
import { withdrawDTO } from '../dtos/withdraw';

@Injectable()
export class WithdrawUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  async execute(input: withdrawDTO.Input): Promise<withdrawDTO.Output> {
    const result = await this.txService.withdraw({ ...input });
    return {
      transactionId: result.transactionId,
      accountId: result.accountId,
      newBalance: result.newBalance,
      feeApplied: result.feeApplied,
    };
  }
}
