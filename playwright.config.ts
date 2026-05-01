import { defineConfig, devices } from "@playwright/test";

const apiPort = 3310;
const clientPort = 5180;
const e2eDataDirectory = `/private/tmp/bg-maker-e2e-${process.pid}`;
process.env.BGM_E2E_DATA_DIR = e2eDataDirectory;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${clientPort}`,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ],
  webServer: [
    {
      command: `HOST=127.0.0.1 PORT=${apiPort} BGM_DATA_DIR=${e2eDataDirectory} pnpm --filter @bg-maker/server exec tsx src/index.ts`,
      url: `http://127.0.0.1:${apiPort}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false
    },
    {
      command: `VITE_API_PROXY_TARGET=http://127.0.0.1:${apiPort} pnpm --filter @bg-maker/client exec vite --host 127.0.0.1 --port ${clientPort}`,
      url: `http://127.0.0.1:${clientPort}`,
      timeout: 120_000,
      reuseExistingServer: false
    }
  ]
});
