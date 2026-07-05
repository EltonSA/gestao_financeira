import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPgPool } from "./pool";

let migrationPromise: Promise<void> | undefined;

export async function runMigrationsIfNeeded() {
  if (!process.env.DATABASE_URL) {
    console.warn("[db] DATABASE_URL ausente — migrações ignoradas.");
    return;
  }
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const pool = createPgPool();
      const db = drizzle(pool);
      const migrationsFolder = path.join(process.cwd(), "drizzle");
      console.log("[db] Aplicando migrações em", migrationsFolder);
      await migrate(db, { migrationsFolder });
      console.log("[db] Migrações aplicadas.");
    })().catch((err) => {
      migrationPromise = undefined;
      throw err;
    });
  }
  await migrationPromise;
}
