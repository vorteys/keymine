import { defineConfig, devices } from "@playwright/test";

// Tests de bout en bout (TEST-02). Ils attendent que l'application ET le serveur
// temps réel tournent déjà (CI : voir .github/workflows/ci.yml) ; en local,
// `bun run build && bun run start` + `bun run realtime`, ou `bun run dev:all`.
// L'interface est testée en français (langue du navigateur : fr-CA).
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-CA",
    trace: "on-first-retry",
    launchOptions: {
      // Utile quand Chromium est installé ailleurs que dans le cache de Playwright.
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
      args: process.env.CI ? ["--no-sandbox"] : [],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // L'application (build de production) et le serveur temps réel (port 4001) doivent tourner :
  // Playwright les démarre s'ils ne sont pas déjà lancés (en CI, la base est migrée avant).
  webServer: [
    {
      command: "bun run start",
      url: process.env.E2E_BASE_URL ?? "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "bun run realtime",
      port: Number(process.env.REALTIME_PORT ?? 4001),
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
