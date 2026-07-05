export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { runMigrationsIfNeeded } = await import("@/lib/db/runMigrations");
      await runMigrationsIfNeeded();
    } catch (err) {
      console.error("[instrumentation] Falha ao migrar banco:", err);
    }
  }
}
