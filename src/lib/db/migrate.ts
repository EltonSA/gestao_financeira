import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "path";
import Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

type SqliteDatabase = InstanceType<typeof Database>;

const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
			id SERIAL PRIMARY KEY,
			hash text NOT NULL,
			created_at numeric
		)`;

function migrationEntriesFromJournal(migrationsFolder: string) {
  const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  return journal.entries.map((entry) => {
    const sql = fs.readFileSync(
      path.join(migrationsFolder, `${entry.tag}.sql`),
      "utf8"
    );
    const hash = crypto.createHash("sha256").update(sql).digest("hex");
    return { hash, createdAt: entry.when };
  });
}

function tableExists(sqlite: SqliteDatabase, name: string) {
  const row = sqlite
    .prepare(
      "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1"
    )
    .get(name);
  return !!row;
}

/** Bancos criados só com `drizzle-kit push` não tinham `__drizzle_migrations`. */
function baselineLegacyPushDatabase(sqlite: SqliteDatabase, migrationsFolder: string) {
  sqlite.exec(CREATE_MIGRATIONS_TABLE);
  const insert = sqlite.prepare(
    'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)'
  );
  for (const e of migrationEntriesFromJournal(migrationsFolder)) {
    insert.run(e.hash, e.createdAt);
  }
}

export function runSqliteMigrations(
  sqlite: SqliteDatabase,
  db: BetterSQLite3Database<typeof schema>,
  migrationsFolder: string
) {
  const hasMigrations = tableExists(sqlite, "__drizzle_migrations");
  const hasAppData = tableExists(sqlite, "couples");
  if (!hasMigrations && hasAppData) {
    baselineLegacyPushDatabase(sqlite, migrationsFolder);
  }
  migrate(db, { migrationsFolder });
}
