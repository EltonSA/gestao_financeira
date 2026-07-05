import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPgPool, getDatabaseUrl } from "../src/lib/db/pool";

async function main() {
  const url = getDatabaseUrl();
  const pool = createPgPool(url);
  const db = drizzle(pool);

  const migrationsFolder = path.join(process.cwd(), "drizzle");
  console.log("Aplicando migrações em:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log("Migrações aplicadas com sucesso.");
}

main().catch((err) => {
  console.error("Falha ao migrar:", err);
  process.exit(1);
});
