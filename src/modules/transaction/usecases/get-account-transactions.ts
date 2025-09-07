import { Injectable } from '@nestjs/common';
import type { PrismaService } from '@/infra/database/prisma/prisma.service';
import type { getAccountTransactionsDTO } from '../dtos/get-account-transactions';

@Injectable()
export class GetAccountTransactionsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    accountId: string;
    page?: number;
    perPage?: number;
    order?: 'asc' | 'desc';
    status?: 'PENDING' | 'APPLIED' | 'REJECTED';
  }): Promise<getAccountTransactionsDTO.GetAccountTransactionsOutput> {
    const page = input.page ?? 1;
    const perPage = input.perPage ?? 20;
    const order = input.order ?? 'asc';
    const where: any = { accountId: input.accountId };
    if (input.status) where.status = input.status as any;

    const [rows, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: order },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      type: r.type as any,
      amount: Number(r.amountCents) / 100,
      fee: Number(r.feeCents) / 100,
      description: r.description,
      status: r.status as any,
      createdAt: r.createdAt,
      transferId: r.transferId ?? null,
    }));

    const totalPages = Math.max(1, Math.ceil(total / perPage));
    return {
      accountId: input.accountId,
      transactions: items as any,
      meta: {
        page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
        order,
        status: (input.status as any) ?? undefined,
      },
    } as any;
  }
}
