import { loadEnvFiles } from "./load-env";
import { runMigrationsIfNeeded } from "../src/lib/db/runMigrations";

loadEnvFiles();

async function main() {
  await runMigrationsIfNeeded();
  console.log("Migrações aplicadas com sucesso.");
}

main().catch((err) => {
  console.error("Falha ao migrar:", err);
  process.exit(1);
});
