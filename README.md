# Casal + Finanças — MVP SaaS

Aplicação **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS** + **Drizzle ORM** + **SQLite** (`better-sqlite3`) para controle financeiro de casal: cartões, despesas, fixos, metas (cofrinhos), dashboard com gráficos (Recharts), insights e relatórios básicos.

## Requisitos

- Node.js 20+ (recomendado 22 LTS)
- npm

## Como rodar

```bash
cd gestao-casal
npm install
```

Aplicar o schema no SQLite (cria/atualiza `data/app.db`):

```bash
npm run db:push
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

### Variáveis de ambiente (opcional)

- `DATABASE_PATH` — caminho do arquivo SQLite (padrão: `./data/app.db` na raiz do projeto)
- `NEXT_PUBLIC_APP_URL` — URL pública usada no link de convite na criação de casal (padrão: `http://localhost:3000`)

## Fluxos principais

1. **Criar casal** em `/registro` (primeiro membro) — recebe o link de convite para o segundo.
2. **Segundo membro** acessa `/registro?token=...` com o token do convite.
3. **Login** em `/login`.
4. Área autenticada: dashboard em `/`, despesas, cartões, gastos fixos, cofrinhos, calendário, relatórios, configurações e perfil.

## Limite de cartão

- Despesas com **forma crédito** e **cartão** selecionado abatem o limite enquanto o status for pendente, pago ou vencido (não contabiliza cancelada).
- O “usado” é a **soma** dos valores no cartão; ao editar ou excluir, o cálculo é refeito.
- Alertas visuais a partir de **70%, 85% e 95%** do limite.

## Banco e scripts

| Comando        | Descrição                          |
|----------------|------------------------------------|
| `npm run db:push`   | Sincroniza schema (Drizzle) com o SQLite |
| `npm run db:generate` | Gera arquivos de migration (opcional) |
| `npm run db:seed`  | Dados de demo (falha se já existir usuário) |
| `npm run build`    | Build de produção                 |
| `npm run start`     | Servidor pós-`build`            |

**Produção:** use um processo Node com **volume persistente** para o arquivo do SQLite, ou evolua para **LibSQL/Turso** no mesmo Drizzle, se for hospedar em ambiente serverless. Variáveis de exemplo: `.env.example`.

## Estrutura (resumo)

- `src/app/(auth)/` — login e registro
- `src/app/(app)/` — área autenticada (layout com sidebar + navegação mobile)
- `src/lib/db/` — schema Drizzle e conexão
- `src/lib/auth/` — sessão em cookie + hash Argon2
- `src/actions/` — server actions
- `src/lib/data/stats.ts` — agregações do dashboard
- `src/lib/insights/engine.ts` — “Resumo inteligente”
- `scripts/seed.ts` — seed
- `drizzle.config.ts` — configuração Drizzle Kit (URL `file:...` para o mesmo banco)

## Fora do escopo do MVP

- Open Finance / import de faturas / pagamento automático
- Múltiplas organizações complexas (a base está em `couples` e `users` para suportar multi-casal no futuro com poucas migrações)

## Licença

Uso do projeto conforme a necessidade do autor do repositório.
