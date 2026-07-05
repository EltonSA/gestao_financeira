import "server-only";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { getPgPool } from "./pool";

type Db = NodePgDatabase<typeof schema>;

let client: Db | undefined;

function dbInstance(): Db {
  if (!client) client = drizzle(getPgPool(), { schema });
  return client;
}

/** Conexão lazy — só abre o pool na primeira query (permite build sem DATABASE_URL). */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = dbInstance();
    const value = Reflect.get(instance as object, prop, receiver);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(instance);
    }
    return value;
  },
});

export { schema };
