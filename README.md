Banco de Conta Corrente – API (NestJS)

Visão Geral

- API de gestão de conta corrente construída em NestJS, com persistência via Prisma/PostgreSQL.
- Modelagem cobre contas, transações (depósito/saque/transferência), políticas de tarifa e log de lançamentos (razão/ledger).
- Regras de negócio: limite de crédito, taxas automáticas, idempotência por chave, transferências atômicas e processamento em lote.
- Conformidade de concorrência: bloqueio por conta durante operações para garantir consistência.
- Observabilidade e auditoria: interceptor de logging estruturado e razão contábil consultável.

Arquitetura e Modelagem

- Conta (`Account`): id (ULID), número único, saldo, limite de crédito, `fullName`, `cpf` (único para contas ativas), timestamps e soft-delete (`deletedAt`).
- Transação (`Transaction`): id (ULID), tipo (`DEPOSIT`, `WITHDRAW`, `TRANSFER`), valor, taxa, descrição (opcional), status, idempotencyKey, relação com conta e (quando aplicável) transferência.
- Transferência (`Transfer`): id (ULID), contas de origem/destino, valor, taxa aplicada na origem, status e idempotencyKey único.
- Lançamento (`LedgerEntry`): razão contábil por conta/lançamento com saldo após a operação (auditoria).
- Política de tarifas (`FeePolicy`): período de validade, taxa fixa e percentual por tipo de transação (utilizada para calcular tarifas de `WITHDRAW` e `TRANSFER`).

Regras de Negócio

- Limite de crédito: saques/transferências respeitam `saldo + limite` disponível; insuficiência retorna erro e registra tentativa rejeitada.
- Taxas e tarifas: determinadas por `FeePolicy` ativa no momento da operação e aplicadas automaticamente.
- Transferências atômicas: débito na origem e crédito no destino dentro de uma única unidade de trabalho (UoW), com lançamentos no ledger de ambas as contas.
- Idempotência: operações aceitam `Idempotency-Key` (UUIDv4). Repetições com a mesma chave não aplicam duplicidade e retornam o mesmo resultado lógico.
- CPF: validado e normalizado (somente dígitos) no usecase; unicidade garantida entre contas ativas.

Concorrência e Desempenho

- Bloqueio por conta (`AccountLockService`): utiliza `async-mutex` para serializar operações concorrentes por id de conta (ou par de contas em transferências).
- Batch: depósitos/saques e transferências por lote são agrupados por conta/par de contas para minimizar contenção e escrever no ledger de forma coesa.

Auditoria e Log

- Ledger: cada aplicação (ou rejeição) gera lançamentos com saldo após a operação, permitindo reconciliação e auditoria.
- Interceptor de logging estruturado: logs com requestId, classe/método, entrada/saída, classificação de erros conhecidos e desconhecidos.

Endpoints Principais

- Conta
  - `POST /account` – cria conta (fullName, cpf, creditLimit obrigatórios; valida CPF; garante unicidade entre contas ativas).
  - `POST /account/:accountId` – atualiza `fullName`, `cpf`, `creditLimit` (CPF validado e único em contas ativas).
  - `GET /account/:accountId` – consulta dados da conta.
- Transações
  - `POST /transactions/:accountId/deposit` – enfileira depósito (requer `Idempotency-Key`).
  - `POST /transactions/:accountId/withdraw` – enfileira saque (requer `Idempotency-Key`).
  - `GET  /transactions/:accountId` – lista transações com paginação/filtros.
- Transferências
  - `POST /transfer` – enfileira transferência (requer `Idempotency-Key`).
- Razão (Ledger)
  - `GET /accounts/:accountId/ledger` – lista lançamentos contábeis (com paginação e ordenação).

Processamento de Transações

- Filas: integração de filas abstraída; em testes, execução in-process. Produção suporta RabbitMQ (providers de send/consume).
- Lote: implementações batch para depósitos/saques e transferências garantem atomicidade por conta/par e reversão completa em falhas.

Concorrência

- Operações concorrentes na mesma conta/par de contas são serializadas por mutex; reduz race conditions e inconsistência de saldo/ledger.

Setup e Execução

1. Dependências

- Node.js 18+ (recomendado 20+), pnpm.
- PostgreSQL local (ou via Docker).

2. Variáveis de ambiente

- `.env` e `.env.test` (exemplos inclusos). Principais:
  - `DATABASE_URL` – conexão PostgreSQL.
  - `QUEUE_SERVER_URL` – RabbitMQ (opcional; testes usam fake/in-process).

3. Banco de dados (Prisma)

- Gerar cliente e aplicar migrações:
  - `pnpm prisma:generate && pnpm prisma:migrate`
- Popular base com seeds (contas com CPF/nome e políticas de tarifa):
  - `pnpm prisma:seed`

4. Rodar a API

- Dev: `pnpm start:dev`
- Swagger: `/doc` (com descrições e exemplos).

Testes

- Unitários e integração (sem DB): `pnpm test`
- E2E com DB real: `pnpm test:e2e:db`
  - Pré-requisitos: banco rodando, migrações aplicadas e seeds.
- Estratégias cobertas:
  - Idempotência HTTP (com `Idempotency-Key`) para depósito/saque/transferência.
  - Concorrência de transferências serializadas por conta.
  - Batch de transações com verificação de ledger e saldos.
  - LedgerController: paginação, ordenação e 404 para conta inexistente.
  - AccountController: criação/atualização de conta com CPF válido e unicidade entre contas ativas.

Decisões de Projeto

- ULID para ids: ordenáveis/únicos, facilitam ordenação temporal.
- Zod + nestjs-zod para validação de DTOs e integração com Swagger.
- Prisma (PostgreSQL): produtividade, migrações versionadas e seed.
- Idempotência: chaves específicas por tipo de operação para evitar duplicidade sem armazenar estado à parte.
- Mutex em memória para serialização por conta: simples e eficaz para a camada de aplicação; DB garante atomicidade.

Limitações e Melhorias Futuras

- Entidade de usuário e autenticação/ACL: não implementadas (foco no escopo do teste), mas fundamentais em um sistema bancário real.
- Idempotência robusta: persistir/expirar chaves em storage dedicado (ex.: Redis) para alta confiabilidade entre múltiplas instâncias.
- Escalonamento de concorrência: coordenador distribuído para locks (ex.: Redis RedLock) ou filas particionadas.
- Resiliência de filas: outbox/saga e DLQ para reprocessamento confiável.
- Observabilidade: métricas (Prometheus), tracing distribuído e dashboards.
- Segurança/privacidade: criptografia de PII (CPF), masking e conformidade regulatória (PCI/LGPD).
- Multimoeda e TZ-aware: estender entidades com moeda e normalizar timestamps em UTC.
- Políticas dinâmicas: UI/Admin para manutenção de `FeePolicy` com versionamento.
- Indexação e performance: revisar índices/queries conforme o crescimento do volume.
