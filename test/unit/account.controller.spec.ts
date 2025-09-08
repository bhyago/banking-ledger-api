import { Test } from '@nestjs/testing';
import { vi } from 'vitest';

import { AccountController } from '@/modules/account/ account.controller';
import { CreateAccountUseCase } from '@/modules/account/usecases/create-account';
import { GetAccountByIdUseCase } from '@/modules/account/usecases/get-account-by-id';
import { UpdateAccountUseCase } from '@/modules/account/usecases/update-account';
import { createAccountDTO } from '@/modules/account/dtos/create-account';
import { getAccountByIdDTO } from '@/modules/account/dtos/get-account-by-id';
import { updateAccountDTO } from '@/modules/account/dtos/update-account';
import { ULID } from 'test/ids';

describe('AccountController (Unit)', () => {
  let controller: AccountController;
  let createAccount: { execute: ReturnType<typeof vi.fn> };
  let getAccountById: { execute: ReturnType<typeof vi.fn> };
  let updateAccount: { execute: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    createAccount = { execute: vi.fn() };
    getAccountById = { execute: vi.fn() };
    updateAccount = { execute: vi.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        { provide: CreateAccountUseCase, useValue: createAccount },
        { provide: GetAccountByIdUseCase, useValue: getAccountById },
        { provide: UpdateAccountUseCase, useValue: updateAccount },
      ],
    }).compile();

    controller = moduleRef.get(AccountController);
  });

  test('createAccount calls use case and returns id', async () => {
    const body: createAccountDTO.CreateAccountInput = {
      fullName: 'Ana Maria',
      cpf: '12345678901',
      creditLimit: 500,
    } as any;
    const output: createAccountDTO.CreateAccountOutput = {
      accountId: ULID.ACC1,
    } as any;

    createAccount.execute.mockResolvedValueOnce(output);

    const res = await controller.createAccount(body);

    expect(createAccount.execute).toHaveBeenCalledWith(body);
    expect(res).toEqual(output);
  });

  test('getAccountById forwards params and returns account', async () => {
    const params: getAccountByIdDTO.GetAccountByIdParamsDTO = {
      accountId: ULID.ACC2,
    } as any;
    const output: getAccountByIdDTO.GetAccountByIdOutput = {
      id: ULID.ACC2,
      number: '123456',
      balance: 1000,
      creditLimit: 500,
    } as any;

    getAccountById.execute.mockResolvedValueOnce(output);

    const res = await controller.getAccountById(params);

    expect(getAccountById.execute).toHaveBeenCalledWith({
      accountId: ULID.ACC2,
    });
    expect(res).toEqual(output);
  });

  test('updateAccount merges params/body and returns updated account', async () => {
    const params: updateAccountDTO.UpdateAccountParams = {
      accountId: ULID.ACC3,
    } as any;
    const body: updateAccountDTO.UpdateAccountBody = {
      fullName: 'Novo Nome',
      cpf: '98765432100',
      creditLimit: 750,
    } as any;
    const output: updateAccountDTO.UpdateAccountOutput = {
      accountId: ULID.ACC3,
      fullName: body.fullName!,
      cpf: body.cpf!,
      creditLimit: body.creditLimit!,
    } as any;

    updateAccount.execute.mockResolvedValueOnce(output);

    const res = await controller.updateAccount(params, body);

    expect(updateAccount.execute).toHaveBeenCalledWith({
      accountId: ULID.ACC3,
      fullName: 'Novo Nome',
      cpf: '98765432100',
      creditLimit: 750,
    });
    expect(res).toEqual(output);
  });
});
