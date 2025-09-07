import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../repositories/account-repository';
import { getAccountByIdDTO } from '../dtos/get-account-by-id';
import { accountErrors } from '../errors/account-errors';

@Injectable()
export class GetAccountByIdUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(
    input: getAccountByIdDTO.GetAccountByIdInput,
  ): Promise<getAccountByIdDTO.GetAccountByIdOutput> {
    const account = await this.accountRepository.findById({
      accountId: input.accountId,
    });

    if (!account) {
      throw new accountErrors.AccountNotFoundError();
    }

    return {
      id: account.id.toValue(),
      number: account.number,
      balance: account.balance,
      creditLimit: account.creditLimit,
    };
  }
}
