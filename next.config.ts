import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@node-rs/argon2"],
  /** Garante que migrações SQL vão no trace (ex.: `output: "standalone"` / Docker). */
  outputFileTracingIncludes: {
    "/*": ["./drizzle/**/*.sql", "./drizzle/meta/**/*.json"],
  },
};

export default nextConfig;
