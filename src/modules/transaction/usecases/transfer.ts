import { Injectable } from '@nestjs/common';
import { AccountTransactionService } from '../services/account-transaction.service';
import { transferDTO } from '../dtos/transfer';

@Injectable()
export class TransferUseCase {
  constructor(private readonly txService: AccountTransactionService) {}

  async execute(input: transferDTO.Input): Promise<transferDTO.Output> {
    const result = await this.txService.transfer({
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      amount: input.amount,
      description: input.description,
    });
    return {
      transferId: result.transferId,
      fromAccountId: result.fromAccountId,
      toAccountId: result.toAccountId,
      fromNewBalance: result.fromNewBalance,
      toNewBalance: result.toNewBalance,
      feeApplied: result.feeApplied,
    };
  }
}
