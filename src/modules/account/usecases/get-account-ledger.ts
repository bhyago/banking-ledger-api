import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../repositories/account-repository';
import { accountErrors } from '../errors/account-errors';
import { getAccountLedgerDTO } from '../dtos/get-account-leadger';

@Injectable()
export class GetAccountLedgerUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(input: getAccountLedgerDTO.Input): Promise<void> {
    const account = await this.accountRepository.findById({
      accountId: input.accountId,
    });

    if (!account) {
      throw new accountErrors.AccountNotFoundError();
    }
  }
}
