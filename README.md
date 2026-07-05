# Casal + Finanças — MVP SaaS

Aplicação **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS** + **Drizzle ORM** + **PostgreSQL** para controle financeiro de casal: cartões, despesas, entradas, fixos, metas (cofrinhos), dashboard com gráficos (Recharts), insights e relatórios básicos.

## Requisitos

- Node.js 20+ (recomendado 22 LTS)
- npm
- PostgreSQL 14+ (local, Supabase, Neon, Railway, etc.)

## Como rodar

```bash
cd gestao-casal
npm install
```

Copie `.env.example` para `.env.local` e configure `DATABASE_URL` com a connection string do Postgres.

**Opção rápida (Docker):** suba um Postgres local e aplique as migrações:

```bash
npm run db:up
npm run db:migrate
```

Isso usa o `docker-compose.yml` na raiz (`gestao` / `gestao` / `gestao_casal` na porta **5434** — evita conflito com Postgres instalado no Windows).

**Sem Docker:** instale PostgreSQL 14+ ou use uma URL gratuita (Neon, Supabase) em `DATABASE_URL` no `.env.local`.

**Primeira vez (banco vazio):** crie todas as tabelas com:

```bash
npm run db:migrate
```

Popular dados de demonstração (um casal, dois usuários, cartões, despesas, metas):

```bash
npm run db:seed
```

Subir o servidor de desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Você será redirecionado para o login se não houver sessão.

### Credenciais demo (após `db:seed`)

- **E-mails:** `elton@exemplo.com` ou `leticia@exemplo.com`
- **Senha:** `demo123`

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | **Obrigatória.** Connection string PostgreSQL (`postgresql://user:pass@host:5432/db`) |
| `DATABASE_SSL` | `true` / `false` — SSL na conexão (padrão: `true` fora de localhost) |
| `NEXT_PUBLIC_APP_URL` | URL pública para links de convite (padrão: `http://localhost:3000`) |

Para alterar o schema, gere uma nova migração e aplique em produção:

```bash
npm run db:generate
npm run db:migrate
```

## Fluxos principais

1. **Criar casal** em `/registro` (primeiro membro) — recebe o link de convite para o segundo.
2. **Segundo membro** acessa `/registro?token=...` com o token do convite.
3. **Login** em `/login`.
4. Área autenticada: dashboard em `/`, despesas, entradas, cartões, gastos fixos, cofrinhos, calendário, relatórios, configurações e perfil.

## Limite de cartão

- Despesas com **forma crédito** e **cartão** selecionado abatem o limite enquanto o status for pendente, pago ou vencido (não contabiliza cancelada).
- O “usado” é a **soma** dos valores no cartão; ao editar ou excluir, o cálculo é refeito.
- Alertas visuais a partir de **70%, 85% e 95%** do limite.

## Banco e scripts

| Comando | Descrição |
|---------|-----------|
| `npm run db:migrate` | Aplica migrações SQL em `drizzle/` no Postgres configurado em `DATABASE_URL` |
| `npm run db:generate` | Gera novo arquivo SQL em `drizzle/` a partir do `schema.ts` |
| `npm run db:push` | Sincroniza schema direto no banco (prototipar; prefira migrate em produção) |
| `npm run db:seed` | Dados de demo (ignora se já existir usuário) |
| `npm run build` | Build de produção |
| `npm run start` | Servidor pós-`build` |

### Deploy em produção

1. Crie o banco PostgreSQL no host (Supabase, Neon, Railway, cPanel, etc.).
2. Configure **`DATABASE_URL`** (e `NEXT_PUBLIC_APP_URL`) nas variáveis de ambiente do host.
3. Se o Postgres do host **não usa SSL** (comum em cPanel/servidor próprio), adicione `DATABASE_SSL=false`.
4. Faça deploy — o app **aplica migrações automaticamente** na subida do servidor. Também pode rodar manualmente: `npm run db:migrate`.
5. Acesse `/registro` para criar o casal (banco começa vazio).

**Erro “Application error” após deploy?** Verifique no painel do host:
- `DATABASE_URL` está definida e aponta para o banco correto
- Usuário/senha/host/porta na URL estão certos
- Migrações rodaram (logs devem mostrar `[db] Migrações aplicadas`)
- Limpe cookies do site no navegador (sessão antiga do SQLite pode causar comportamento estranho)

## Estrutura (resumo)

- `src/app/(auth)/` — login e registro
- `src/app/(app)/` — área autenticada (layout com sidebar + navegação mobile)
- `src/lib/db/` — schema Drizzle e conexão Postgres
- `src/lib/auth/` — sessão em cookie + hash Argon2
- `src/actions/` — server actions
- `src/lib/data/stats.ts` — agregações do dashboard
- `src/lib/insights/engine.ts` — “Resumo inteligente”
- `scripts/migrate.ts` — aplica migrações
- `scripts/seed.ts` — seed
- `drizzle.config.ts` — configuração Drizzle Kit

## Fora do escopo do MVP

- Open Finance / import de faturas / pagamento automático
- Múltiplas organizações complexas (a base está em `couples` e `users` para suportar multi-casal no futuro com poucas migrações)

## Licença

Uso do projeto conforme a necessidade do autor do repositório.
