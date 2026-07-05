import { Pool, type PoolConfig } from "pg";

function shouldUseSsl(connectionString: string) {
  if (process.env.DATABASE_SSL === "false") return false;
  if (process.env.DATABASE_SSL === "true") return true;
  const lower = connectionString.toLowerCase();
  if (lower.includes("localhost") || lower.includes("127.0.0.1")) return false;
  return true;
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a connection string do PostgreSQL no .env.local ou no painel do host."
    );
  }
  return url;
}

export function createPgPool(connectionString = getDatabaseUrl()) {
  const config: PoolConfig = {
    connectionString,
    max: 10,
  };
  if (shouldUseSsl(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }
  return new Pool(config);
}

declare global {
  var __gestaoCasalPgPool: Pool | undefined;
}

export function getPgPool() {
  if (!globalThis.__gestaoCasalPgPool) {
    globalThis.__gestaoCasalPgPool = createPgPool();
  }
  return globalThis.__gestaoCasalPgPool;
}
