import { defineConfig } from "drizzle-kit";
import path from "path";

const filePath = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "app.db");
/* drizzle-kit 0.31+ usa esquema file: para LibSQL (SQLite) */
const dbUrl = filePath.replace(/\\/g, "/");
const fileUrl = dbUrl.startsWith("file:") ? dbUrl : `file:${dbUrl}`;

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: fileUrl },
});
