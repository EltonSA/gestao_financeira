# Estrutura e Funcionalidades — Casal + Finanças

Documento de referência sobre a arquitetura, organização de pastas e capacidades atuais do sistema **gestao-casal** (MVP SaaS de gestão financeira familiar).

---

## Visão geral

| Item | Detalhe |
|------|---------|
| **Nome** | Casal + Finanças (`gestao-casal`) |
| **Versão** | 0.1.0 (MVP) |
| **Stack** | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL |
| **Autenticação** | Sessão em cookie + hash Argon2 (sem OAuth) |
| **Modelo de dados** | Multi-casal por `couples` + `users`; cada casal isola seus lançamentos |
| **Deploy** | Migrações automáticas na subida do servidor (`instrumentation.ts`) |

O sistema permite que um casal (e opcionalmente filhos com conta própria) registre despesas, entradas, cartões, gastos recorrentes e metas financeiras, com dashboard analítico, insights automáticos e relatórios básicos.

---

## Arquitetura em camadas

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (React Client Components onde necessário)          │
├─────────────────────────────────────────────────────────────┤
│  Next.js App Router — páginas Server Components            │
│  src/app/(auth)/  ·  src/app/(app)/                         │
├─────────────────────────────────────────────────────────────┤
│  Server Actions — src/actions/*.ts                          │
├─────────────────────────────────────────────────────────────┤
│  Serviços e regras de negócio — src/lib/services/           │
│  Agregações — src/lib/data/  ·  Insights — src/lib/insights/│
├─────────────────────────────────────────────────────────────┤
│  Drizzle ORM — src/lib/db/schema.ts + pool                  │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL (local Docker, Supabase, Neon, etc.)            │
└─────────────────────────────────────────────────────────────┘
```

### Sincronização automática (a cada request autenticado)

No layout da área logada (`src/app/(app)/layout.tsx`), ao entrar no app:

1. **Despesas vencidas** — `syncOverdueForCouple` atualiza status `pending` → `overdue`
2. **Gastos recorrentes** — `syncRecurringForCouple` gera despesas do mês (idempotente)
3. **Entradas recorrentes** — `syncRecurringIncomesForCouple` gera receitas do mês (idempotente)

Contas de filho(a) não disparam a geração de recorrentes (apenas adultos).

---

## Estrutura de pastas

```
gestao-casal/
├── drizzle/                    # Migrações SQL versionadas
│   ├── 0000_init.sql
│   └── 0002_recurring_incomes.sql
├── scripts/
│   ├── migrate.ts              # Aplica migrações
│   ├── seed.ts                 # Dados de demonstração
│   └── db.ts / load-env.ts
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout raiz (tema, providers)
│   │   ├── globals.css         # Design tokens e utilitários
│   │   ├── (auth)/             # Rotas públicas de autenticação
│   │   │   ├── login/
│   │   │   └── registro/       # Casal + convite filho
│   │   └── (app)/              # Área autenticada (sidebar + mobile tabs)
│   │       ├── page.tsx        # Dashboard
│   │       ├── despesas/
│   │       ├── entradas/
│   │       ├── gastos-fixos/
│   │       ├── cartoes/
│   │       ├── cofrinhos/
│   │       ├── calendario/
│   │       ├── relatorios/
│   │       ├── configuracoes/
│   │       └── perfil/
│   ├── actions/                # Server Actions (mutações)
│   │   ├── auth.ts
│   │   ├── expenses.ts
│   │   ├── incomes.ts
│   │   ├── recurring.ts
│   │   ├── recurringIncomes.ts
│   │   ├── cards.ts
│   │   ├── goals.ts
│   │   ├── settings.ts
│   │   └── children.ts
│   ├── components/
│   │   ├── layout/app-shell.tsx    # Navegação principal
│   │   ├── dashboard/              # Gráficos Recharts
│   │   ├── forms/                  # Campos reutilizáveis de formulário
│   │   ├── cards/wallet-card.tsx   # Cartão visual de limite
│   │   ├── settings/               # Convites, senha, membros
│   │   └── ui/                     # Primitivos (Button, Card, Dialog…)
│   ├── lib/
│   │   ├── db/                     # Schema Drizzle + conexão Postgres
│   │   ├── auth/                   # Sessão, senha, papéis
│   │   ├── data/stats.ts           # Agregações do dashboard
│   │   ├── data/children.ts
│   │   ├── insights/engine.ts      # Resumo inteligente
│   │   ├── services/               # Limite de cartão, recorrentes, carteira
│   │   ├── constants.ts            # Categorias, formas de pagamento, metas
│   │   ├── dates.ts / money.ts
│   │   └── syncOverdue.ts
│   └── instrumentation.ts          # Migrações no boot do servidor
├── docker-compose.yml              # Postgres local (porta 5434)
├── drizzle.config.ts
└── package.json
```

---

## Modelo de dados (entidades principais)

| Tabela | Propósito |
|--------|-----------|
| `couples` | Casal/família — nome e rótulos customizáveis (Pessoa 1 / Pessoa 2) |
| `users` | Usuários com e-mail, senha, papel no casal (`person1`, `person2`) ou conta de filho (`linkedChildId`) |
| `sessions` | Sessões de login com expiração |
| `couple_invites` | Token para o segundo adulto se registrar |
| `couple_children` | Filhos cadastrados (responsável nas despesas: `child:{id}`) |
| `child_invites` | Convite para filho criar login próprio |
| `cards` | Cartões (crédito, débito ou ambos) com limite, fechamento e vencimento |
| `categories` | Categorias de despesa (sistema + por casal) |
| `expenses` | Despesas — fixas, variáveis, parceladas ou vinculadas a meta |
| `incomes` | Entradas — únicas, recorrentes ou parceladas |
| `recurring_expenses` | Modelos de gasto fixo mensal |
| `recurring_incomes` | Modelos de entrada mensal (salário, etc.) |
| `goals` | Metas / cofrinhos com valor alvo e progresso |
| `goal_contributions` | Aportes individuais em uma meta |

### Responsáveis nas transações

- `person1` / `person2` — adultos do casal (rótulos editáveis)
- `both` — despesa/entrada compartilhada
- `child:{uuid}` — gasto atribuído a um filho cadastrado

---

## Rotas e funcionalidades

### Área pública — `(auth)/`

| Rota | Funcionalidade |
|------|----------------|
| `/login` | Login com e-mail e senha |
| `/registro` | Primeiro membro cria o casal; gera link de convite para o segundo |
| `/registro?token=…` | Segundo adulto completa cadastro via convite |
| `/registro/filho?token=…` | Filho(a) cria conta vinculada ao perfil infantil |

### Área autenticada — `(app)/`

Navegação via sidebar (desktop) e barra inferior com FAB “Nova despesa” (mobile).

| Rota | Módulo | Funcionalidades |
|------|--------|------------------|
| `/` | **Visão geral** | KPIs do dia/semana/mês; gráficos (barras, linha, pizza); carteira de cartões; metas; gastos recorrentes; projeção de fim de mês; insights inteligentes |
| `/despesas` | **Despesas** | Listagem com filtros (status, categoria, responsável, cartão); criar, editar, excluir |
| `/despesas/nova` | | Nova despesa com parcelamento, recorrência, vínculo a cartão e meta |
| `/despesas/[id]/editar` | | Edição completa; recálculo de limite de cartão |
| `/entradas` | **Entradas** | Receitas únicas, parceladas e modelos recorrentes; botão “Gerar agora” |
| `/entradas/nova` | | Nova entrada |
| `/entradas/recorrentes/novo` | | Modelo de recebimento mensal |
| `/entradas/recorrentes/[id]/editar` | | Editar modelo recorrente |
| `/gastos-fixos` | **Recorrentes** | Modelos de despesa fixa; geração automática mensal; estatísticas do mês |
| `/gastos-fixos/novo` | | Novo modelo de gasto fixo |
| `/gastos-fixos/[id]/editar` | | Editar modelo |
| `/cartoes` | **Cartões** | Listagem com uso de limite, alertas (70/85/95%), débito e entradas no cartão |
| `/cartoes/novo` | | Cadastro (instituição, dono, limite, dias de fechamento/vencimento, tipo) |
| `/cartoes/[id]/editar` | | Edição e ativação/desativação |
| `/cofrinhos` | **Cofrinhos** | Metas com progresso, categorias (viagem, emergência, casa…) |
| `/cofrinhos/nova` | | Nova meta |
| `/cofrinhos/[id]/editar` | | Editar meta e registrar aportes |
| `/calendario` | **Calendário** | Próximos vencimentos; fechamentos de fatura; prazos de metas |
| `/relatorios` | **Relatórios** | Resumo do mês: pago, pendente, vencido, comparação com mês anterior, distribuição por pessoa |
| `/configuracoes` | **Configurações** | Nome do casal e rótulos; convite do 2º adulto; filhos e convites; troca de senha; remoção de membro |
| `/perfil` | **Perfil** | Nome de exibição do usuário logado |

---

## Funcionalidades por domínio

### 1. Autenticação e família

- Registro do casal com seed de categorias padrão
- Convite por token com expiração para segundo adulto
- Filhos: cadastro pelo casal + convite opcional para login restrito
- Conta de filho: responsável travado no próprio perfil; sem acesso a configurações nem recorrentes
- Logout via Server Action
- Senha com Argon2; sessão em cookie HTTP-only

### 2. Despesas

- **Tipos:** fixa, variável, parcelada (`installment`), meta (`goal`)
- **Status:** pendente, pago, vencido (automático), cancelada
- **Formas de pagamento:** dinheiro, Pix, débito, crédito, boleto, transferência, outro
- **Recorrência na despesa:** semanal, mensal, anual (além dos modelos em Gastos Fixos)
- **Parcelamento:** até 60 parcelas com `installmentGroupId`
- Validação de cartão conforme tipo (`credit` / `debit` / `both`) e limite disponível
- Filtros na listagem client-side (`despesas-list.tsx`)

### 3. Entradas

- Entradas únicas, recorrentes (via modelo) ou parceladas
- Vínculo opcional a cartão (entradas creditadas no cartão afetam “disponível”)
- Modelos recorrentes: título, valor, dia do mês, responsável
- Geração idempotente por `YYYY-MM` (`lastGeneratedYearMonth`)

### 4. Gastos recorrentes (despesas)

- Modelo mensal: nome, valor, categoria, dia de vencimento, forma de pagamento, cartão, responsável
- Ao abrir o app: cria despesa `pending` se ainda não gerada no mês
- Ação manual “Gerar agora” na interface
- Possível criar modelo a partir de despesa fixa mensal no cadastro

### 5. Cartões

- **Tipos (`cardKind`):** crédito, débito ou ambos
- Limite total, dia de fechamento e vencimento, cor, instituição, dono (pessoa 1, 2 ou compartilhado)
- **Limite de crédito:** soma despesas em crédito com status pendente, pago ou vencido (não cancelada)
- **Alertas visuais:** 70%, 85% e 95% do limite
- **Carteira:** crédito usado/disponível, gastos em débito no cartão, entradas vinculadas, líquido após débito

### 6. Cofrinhos (metas)

- Nome, descrição, valor alvo, valor atual, prazo opcional
- Categorias: viagem, emergência, compra, investimento, casa, carro, outro
- Aportes registrados em `goal_contributions`
- Barra de progresso individual e agregada

### 7. Dashboard e análises

**KPIs:** gasto hoje, últimos 7 dias, mês (pago/pendente/vencido), fixos vs variáveis

**Gráficos (Recharts):**
- Comparativo este mês vs mês anterior
- Série diária de pagamentos
- Distribuição por categoria (pizza)
- Distribuição por responsável (inclui filhos)

**Projeções:** média diária, projeção clássica e por compromissos até fim do mês

**Insights (`runInsights`):** gastos hoje, últimos 7 dias, comparação com mês anterior, cartões perto do limite, metas próximas do prazo, etc.

### 8. Calendário financeiro

- Lista dos próximos 30 vencimentos (pendente/vencido)
- Datas de fechamento e vencimento por cartão
- Metas com data limite

### 9. Configurações

- Editar nome do casal e rótulos das pessoas
- Gerar/copiar link de convite para 2º adulto
- CRUD de filhos + convite de conta infantil
- Alterar senha (dialog)
- Remover membro adulto (com confirmação)

---

## Server Actions (mutações)

| Arquivo | Responsabilidade |
|---------|------------------|
| `auth.ts` | Login, logout, registro casal/convite/filho |
| `expenses.ts` | CRUD despesas, parcelas, status |
| `incomes.ts` | CRUD entradas e parcelas |
| `recurring.ts` | CRUD modelos de gasto fixo + geração manual |
| `recurringIncomes.ts` | CRUD modelos de entrada + geração manual |
| `cards.ts` | CRUD cartões |
| `goals.ts` | CRUD metas e aportes |
| `settings.ts` | Perfil, senha, dados do casal |
| `children.ts` | Filhos, convites e contas infantis |

Todas as ações sensíveis passam por `requireAuth()` ou `requireAdultAuth()` e validação Zod.

---

## Serviços de negócio (`src/lib/services/`)

| Serviço | Função |
|---------|--------|
| `cardLimit.ts` | Cálculo de uso e disponível por cartão |
| `cardWallet.ts` | Resumo consolidado da carteira (crédito + débito + entradas) |
| `recurringSync.ts` | Sincronização de despesas recorrentes |
| `recurringIncomeSync.ts` | Sincronização de entradas recorrentes |

Utilitários complementares: `expenseCardGuard.ts`, `syncOverdue.ts`, `seedCategories.ts`, `metrics.ts`, `responsible.ts`, `cardKind.ts`.

---

## UI e experiência

- **Design system:** componentes em `src/components/ui/` (Radix UI + Tailwind)
- **Tema:** claro/escuro via `next-themes` (`ThemeToggle`)
- **Layout responsivo:** sidebar desktop; drawer + bottom tabs no mobile
- **Formulários:** `react-hook-form` + Zod nos campos compartilhados
- **Moeda:** valores armazenados em centavos (`amountCents`); exibição em BRL (`formatBRL`)
- **Datas:** formato ISO `YYYY-MM-DD` no banco; helpers em `dates.ts`

---

## Banco de dados e scripts

| Comando | Uso |
|---------|-----|
| `npm run db:up` | Sobe Postgres via Docker (porta 5434) |
| `npm run db:migrate` | Aplica migrações em `drizzle/` |
| `npm run db:generate` | Gera nova migração a partir do `schema.ts` |
| `npm run db:push` | Push direto do schema (prototipagem) |
| `npm run db:seed` | Popula casal demo (`elton@exemplo.com` / `demo123`) |
| `npm run dev` | Desenvolvimento com Turbopack |
| `npm run build` / `start` | Produção |

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `DATABASE_SSL` | Não | SSL na conexão (padrão inteligente por host) |
| `NEXT_PUBLIC_APP_URL` | Não | URL base para links de convite |

---

## Fluxos principais do usuário

```mermaid
flowchart TD
    A[Novo usuário] --> B{/registro}
    B --> C[Cria casal + person1]
    C --> D[Link de convite]
    D --> E[person2 registra via token]
    E --> F[/login]
    F --> G[Área autenticada /]
    G --> H[Dashboard]
    G --> I[Lançamentos]
    G --> J[Cartões e metas]
    G --> K[Configurações / filhos]
    K --> L[Convite filho opcional]
    L --> M[Conta restrita filho]
```

1. Primeiro adulto cria o casal em `/registro`
2. Segundo adulto entra pelo link `/registro?token=…`
3. Login em `/login`
4. Uso diário: dashboard, lançar despesas/entradas, acompanhar cartões e cofrinhos
5. Opcional: cadastrar filhos e enviar convite em Configurações

---

## Fora do escopo do MVP

- Open Finance / importação de faturas
- Pagamento automático de contas
- Múltiplas organizações avançadas (a base `couples` permite evolução futura)
- Exportação de relatórios (PDF/CSV) — mencionado como “em breve” na UI
- OAuth / login social

---

## Resumo executivo

O **gestao-casal** é um MVP completo de finanças familiares com:

- **10 módulos** na área logada (dashboard, despesas, entradas, recorrentes, cartões, cofrinhos, calendário, relatórios, configurações, perfil)
- **Isolamento por casal** com suporte a dois adultos e filhos com conta opcional
- **Automação** de vencimentos, recorrentes e insights ao usar o app
- **Controle de limite** de cartão de crédito com alertas progressivos
- **Stack moderna** pronta para deploy com Postgres gerenciado e migrações versionadas

Para detalhes de instalação e credenciais demo, consulte o [README.md](./README.md).
