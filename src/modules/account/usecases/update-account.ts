import { Injectable } from '@nestjs/common';
import { AccountRepository } from '../repositories/account-repository';
import { accountErrors } from '../errors/account-errors';
import { updateAccountDTO } from '../dtos/update-account';
import { cpf as cpfValidator } from 'cpf-cnpj-validator';

@Injectable()
export class UpdateAccountUseCase {
  constructor(private readonly accountRepository: AccountRepository) {}

  async execute(
    input: updateAccountDTO.UpdateAccountInput,
  ): Promise<updateAccountDTO.UpdateAccountOutput> {
    const account = await this.accountRepository.findById({
      accountId: input.accountId,
    });
    if (!account) throw new accountErrors.AccountNotFoundError();

    if (input.cpf) {
      if (!cpfValidator.isValid(input.cpf)) {
        throw new accountErrors.InvalidCPFError();
      }

      const existing = await this.accountRepository.findActiveByCPF({
        cpf: input.cpf,
      });
      if (existing && existing.id.toValue() !== input.accountId) {
        throw new accountErrors.CPFInUseForActiveAccountError();
      }
      account.cpf = input.cpf;
    }

    await this.accountRepository.update(account);
    return {
      accountId: input.accountId,
      fullName: account.fullName,
      cpf: account.cpf,
      creditLimit: account.creditLimit,
    };
  }
}
