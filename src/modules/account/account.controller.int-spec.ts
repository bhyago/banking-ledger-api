import '@/../test/setup-e2e';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '@/infra/app.module';
import { PrismaService } from '@/infra/database/prisma/prisma.service';

describe('AccountController (Integration + DB)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  test('creates account with fullName/cpf and creditLimit', async () => {
    const res = await request(app.getHttpServer())
      .post('/account')
      .send({ fullName: 'Ana Maria', cpf: '12345678909', creditLimit: 500 });
    expect(res.statusCode).toBe(201);
    const id = res.body.accountId as string;
    expect(typeof id).toBe('string');

    const acc = await prisma.account.findUnique({ where: { id } });
    expect(acc).toBeTruthy();
    expect(acc!.fullName).toBe('Ana Maria');
    expect(acc!.cpf).toBe('12345678909');
    expect(Number(acc!.creditLimitCents)).toBe(50000);
  });

  test('updates fullName/cpf/creditLimit of an account', async () => {
    const create = await request(app.getHttpServer())
      .post('/account')
      .send({ fullName: 'João', cpf: '11122233344', creditLimit: 100 });
    const accountId = create.body.accountId as string;

    const res = await request(app.getHttpServer())
      .post(`/account/${accountId}`)
      .send({
        fullName: 'João da Silva',
        cpf: '98765432100',
        creditLimit: 750,
      });
    expect(res.statusCode).toBe(200);

    const acc = await prisma.account.findUnique({ where: { id: accountId } });
    expect(acc!.fullName).toBe('João da Silva');
    expect(acc!.cpf).toBe('98765432100');
    expect(Number(acc!.creditLimitCents)).toBe(75000);
  });

  test('fails with 422 when cpf already in use by another active account', async () => {
    const a = await request(app.getHttpServer())
      .post('/account')
      .send({ fullName: 'A', cpf: '55566677788' });
    const b = await request(app.getHttpServer())
      .post('/account')
      .send({ fullName: 'B', cpf: '99988877766' });
    const accountB = b.body.accountId as string;

    const res = await request(app.getHttpServer())
      .post(`/account/${accountB}`)
      .send({ cpf: '55566677788' });
    expect(res.statusCode).toBe(422);
  });
});
