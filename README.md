# Banco de Conta Corrente – API (NestJS)

## Sumário

- [Visão Geral](#visao-geral)
- [Arquitetura e Modelagem](#arquitetura-e-modelagem)
- [Regras de Negócio](#regras-de-negocio)
- [Concorrência e Desempenho](#concorrencia-e-desempenho)
- [Auditoria e Log](#auditoria-e-log)
- [Endpoints Principais](#endpoints-principais)
- [Processamento de Transações](#processamento-de-transacoes)
  - [Concorrência (em Processamento)](#concorrencia-processamento)
- [Setup e Execução](#setup-e-execucao)
- [Testes](#testes)
- [Decisões de Projeto](#decisoes-de-projeto)
- [Limitações e Melhorias Futuras](#limitacoes-e-melhorias-futuras)

<a id="visao-geral"></a>

### Visão Geral

- API de gestão de conta corrente construída em NestJS, com persistência via Prisma/PostgreSQL.
- Modelagem cobre contas, transações (depósito/saque/transferência), políticas de tarifa e log de lançamentos (razão/ledger).
- Regras de negócio: limite de crédito, taxas automáticas, idempotência por chave, transferências atômicas e processamento em lote.
- Conformidade de concorrência: bloqueio por conta durante operações para garantir consistência.
- Observabilidade e auditoria: interceptor de logging estruturado e razão contábil consultável.

<a id="arquitetura-e-modelagem"></a>

### Arquitetura e Modelagem

- Conta (`Account`): id (ULID), número único, saldo, limite de crédito, `fullName`, `cpf` (único para contas ativas), timestamps e soft-delete (`deletedAt`).
- Transação (`Transaction`): id (ULID), tipo (`DEPOSIT`, `WITHDRAW`, `TRANSFER`), valor, taxa, descrição (opcional), status, idempotencyKey, relação com conta e (quando aplicável) transferência.
- Transferência (`Transfer`): id (ULID), contas de origem/destino, valor, taxa aplicada na origem, status e idempotencyKey único.
- Lançamento (`LedgerEntry`): razão contábil por conta/lançamento com saldo após a operação (auditoria).
- Política de tarifas (`FeePolicy`): período de validade, taxa fixa e percentual por tipo de transação (utilizada para calcular tarifas de `WITHDRAW` e `TRANSFER`).

<a id="regras-de-negocio"></a>

### Regras de Negócio

- Limite de crédito: saques/transferências respeitam `saldo + limite` disponível; insuficiência retorna erro e registra tentativa rejeitada.
- Taxas e tarifas: determinadas por `FeePolicy` ativa no momento da operação e aplicadas automaticamente.
- Transferências atômicas: débito na origem e crédito no destino dentro de uma única unidade de trabalho (UoW), com lançamentos no ledger de ambas as contas.
- Idempotência: operações aceitam `Idempotency-Key` (UUIDv4). Repetições com a mesma chave não aplicam duplicidade e retornam o mesmo resultado lógico.
- CPF: validado e normalizado (somente dígitos) no usecase; unicidade garantida entre contas ativas.

<a id="concorrencia-e-desempenho"></a>

### Concorrência e Desempenho

- Bloqueio por conta (`AccountLockService`): utiliza `async-mutex` para serializar operações concorrentes por id de conta (ou par de contas em transferências).
- Batch: depósitos/saques e transferências por lote são agrupados por conta/par de contas para minimizar contenção e escrever no ledger de forma coesa.

<a id="auditoria-e-log"></a>

### Auditoria e Log

- Ledger: cada aplicação (ou rejeição) gera lançamentos com saldo após a operação, permitindo reconciliação e auditoria.
- Interceptor de logging estruturado: logs com requestId, classe/método, entrada/saída, classificação de erros conhecidos e desconhecidos.

<a id="endpoints-principais"></a>

### Endpoints Principais

- Conta
  - `POST /account` – cria conta (fullName, cpf, creditLimit obrigatórios; valida CPF; garante unicidade entre contas ativas).
  - `PATCH /account/:accountId` – atualiza `fullName`, `cpf`, `creditLimit` (CPF validado e único em contas ativas).
  - `GET /account/:accountId` – consulta dados da conta.
- Transações
  - `POST /transactions/:accountId/deposit` – enfileira depósito (requer `Idempotency-Key`).
  - `POST /transactions/:accountId/withdraw` – enfileira saque (requer `Idempotency-Key`).
  - `GET  /transactions/:accountId` – lista transações com paginação/filtros.
- Transferências
  - `POST /transfer` – enfileira transferência (requer `Idempotency-Key`).
- Razão (Ledger)
  - `GET /accounts/:accountId/ledger` – lista lançamentos contábeis (com paginação e ordenação).

<a id="processamento-de-transacoes"></a>

### Processamento de Transações

- Filas: integração de filas abstraída; em testes, execução in-process. Produção suporta RabbitMQ (providers de send/consume).
- Lote: implementações batch para depósitos/saques e transferências garantem atomicidade por conta/par e reversão completa em falhas.

Nota sobre workers e eventos

- Atualmente a API utiliza RabbitMQ para enfileirar mensagens e consumidores implementados no próprio app Nest, além de eventos do Nest para algumas integrações internas.
- Como melhoria, os consumidores podem rodar como um serviço Worker separado (processo/contêiner dedicado) para melhor isolamento e escalabilidade horizontal.

<a id="concorrencia-processamento"></a>

#### Concorrência

- Operações concorrentes na mesma conta/par de contas são serializadas por mutex; reduz race conditions e inconsistência de saldo/ledger.

<a id="setup-e-execucao"></a>

### Setup e Execução

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

  3.1. Novo Banco (passo a passo Prisma)

- Pré‑requisito: configure `DATABASE_URL` em `.env` apontando para um DB vazio/acessível.
- Via scripts (pnpm):
  - `pnpm prisma:generate` – gera o Prisma Client.
  - `pnpm prisma:migrate` – aplica migrações (`prisma migrate dev`).
  - `pnpm prisma:seed` – popula dados iniciais.
- Via npx (alternativa equivalente):
  - `npx prisma generate`
  - `npx prisma migrate dev`
  - `npx prisma db seed`
- Em caso de falha nas migrações (ex.: estado inconsistente do schema):
  - `npx prisma migrate reset --force --skip-seed`
  - Em seguida, rode novamente as migrações e (se necessário) o seed:
    - `npx prisma migrate dev` e depois `npx prisma db seed`

IMPORTANTE

- Execute `pnpm prisma:seed` antes de subir a API pela primeira vez (e sempre que recriar o banco). Sem os seeds, algumas rotas podem retornar vazio ou falhar por ausência de dados iniciais (ex.: políticas de tarifa e contas de exemplo).

4. Rodar a API

- Dev: `pnpm start:dev`
- Swagger: `/doc` (com descrições e exemplos).

### Docker Compose

- Subir dependências: `docker compose up -d`
- Derrubar dependências: `docker compose down`
- Serviços: Postgres em `localhost:5432` (DB: `banking-ledger`), RabbitMQ em `localhost:5672` (UI: `http://localhost:15672`, usuário/senha: `rabbitmq`/`rabbitmq`).
- `.env` sugerido (host):
  - `DATABASE_URL=postgresql://postgres:docker@localhost:5432/banking-ledger?schema=public`
  - `QUEUE_SERVER_URL=amqp://rabbitmq:rabbitmq@localhost:5672`
- `.env.test` (E2E com DB): use `localhost` também; o DB `banking-ledger-test` precisa existir. Você pode criá-lo conectando no Postgres e executando `CREATE DATABASE "banking-ledger-test";` ou ajustar a URL para reutilizar `banking-ledger` durante o desenvolvimento.

Scripts úteis (pnpm / npx)

- `pnpm prisma:generate` – gera o Prisma Client (`npx prisma generate`).
- `pnpm prisma:migrate` – aplica migrações (`npx prisma migrate dev`).
- `pnpm prisma:seed` – roda o seed (`npx prisma db seed`).
- `pnpm prisma:push` – sincroniza schema sem migrações (dev) (`npx prisma db push`).

Dependências locais

- Alternativamente ao Docker, você pode manter Postgres e RabbitMQ instalados localmente. Ajuste as variáveis de ambiente conforme seu setup.

<a id="testes"></a>

### Testes

- Unitários e integração (sem DB): `pnpm test`
- E2E com DB real: `pnpm test:e2e`
  - Pré-requisitos: banco rodando, migrações aplicadas e seeds.

<a id="decisoes-de-projeto"></a>

### Decisões de Projeto

- ULID para ids: ordenáveis/únicos, facilitam ordenação temporal.
- Zod + nestjs-zod para validação de DTOs e integração com Swagger.
- Prisma (PostgreSQL): produtividade, migrações versionadas e seed.
- Idempotência: chaves específicas por tipo de operação para evitar duplicidade sem armazenar estado à parte.
- Mutex em memória para serialização por conta: simples e eficaz para a camada de aplicação; DB garante atomicidade.

<a id="limitacoes-e-melhorias-futuras"></a>

### Limitações e Melhorias Futuras

- Entidade de usuário e autenticação/ACL: não implementadas (foco no escopo do teste), mas fundamentais em um sistema bancário real.
- Idempotência robusta: persistir/expirar chaves em storage dedicado (ex.: Redis) para alta confiabilidade entre múltiplas instâncias.
- Escalonamento de concorrência: coordenador distribuído para locks (ex.: Redis RedLock) ou filas particionadas.
- Resiliência de filas: outbox/saga e DLQ para reprocessamento confiável.
- Observabilidade: métricas (Prometheus), tracing distribuído e dashboards.
- Multimoeda e TZ-aware: estender entidades com moeda e normalizar timestamps em UTC.
- Políticas dinâmicas: UI/Admin para manutenção de `FeePolicy` com versionamento.
- Indexação e performance: revisar índices/queries conforme o crescimento do volume.
