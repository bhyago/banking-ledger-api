import { Injectable } from '@nestjs/common';
import { createAccountDTO } from '../dtos/create-account';
import { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';

@Injectable()
export class CreateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(): Promise<createAccountDTO.CreateAccountOutput> {
    const account = Account.create({});
    const savedAccount = await this.accountRepository.save(account);

    return {
      accountId: savedAccount.id,
    };
  }
}
