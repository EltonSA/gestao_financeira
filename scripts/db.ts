import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/db/schema";
import { createPgPool } from "../src/lib/db/pool";
import { loadEnvFiles } from "./load-env";

loadEnvFiles();

const pool = createPgPool();
export const db = drizzle(pool, { schema });
export { schema, pool };
