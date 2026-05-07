import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { runSqliteMigrations } from "./migrate";

const defaultPath = path.join(process.cwd(), "data", "app.db");
const databasePath = process.env.DATABASE_PATH ?? defaultPath;

const dir = path.dirname(databasePath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const sqlite = new Database(databasePath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const migrationsFolder = path.join(process.cwd(), "drizzle");
if (!fs.existsSync(path.join(migrationsFolder, "meta", "_journal.json"))) {
  throw new Error(
    'Migrações em "drizzle/" não encontradas (meta/_journal.json). Sem isso o banco não pode ser criado automaticamente.'
  );
}

export const db = drizzle(sqlite, { schema });
runSqliteMigrations(sqlite, db, migrationsFolder);
export { schema };
