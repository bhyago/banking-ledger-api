import { Injectable } from '@nestjs/common';
import type { createAccountDTO } from '../dtos/create-account';
import type { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';

@Injectable()
export class CreateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(
    input: createAccountDTO.CreateAccountInput,
  ): Promise<createAccountDTO.CreateAccountOutput> {
    const account = Account.create({
      creditLimit: input?.creditLimit ?? 0,
    });
    if (typeof input?.creditLimit === 'number' && input.creditLimit >= 0) {
      account.creditLimit = input.creditLimit;
    }
    const savedAccount = await this.accountRepository.save(account);

    return {
      accountId: savedAccount.id,
    };
  }
}
