import { defineConfig } from "vitest/config";

// Tests d'intégration contre une vraie base PostgreSQL migrée
// (DATABASE_URL requis). Lancés via `bun run test:db`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
});
