import { Injectable } from '@nestjs/common';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';
import type { createAccountDTO } from '../dtos/create-account';
import { AccountRepository } from '../repositories/account-repository';
import { Account } from '../entities/account';
import { accountErrors } from '../errors/account-errors';

@Injectable()
export class CreateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(
    input: createAccountDTO.CreateAccountInput,
  ): Promise<createAccountDTO.CreateAccountOutput> {
    if (!cpfValidator.isValid(input.cpf)) {
      throw new accountErrors.InvalidCPFError();
    }
    const existing = await this.accountRepository.findActiveByCPF({
      cpf: input.cpf,
    });
    if (existing) {
      throw new accountErrors.CPFInUseForActiveAccountError();
    }
    const account = Account.create({
      creditLimit: input?.creditLimit ?? 0,
      fullName: input?.fullName ?? null,
      cpf: input?.cpf ?? null,
    });

    const savedAccount = await this.accountRepository.save(account);
    return {
      accountId: savedAccount.id,
    };
  }
}
