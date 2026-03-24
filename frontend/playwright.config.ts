import { defineConfig, devices } from "@playwright/test";

const backendPort = 8010;
const frontendPort = 3010;
const apiBaseUrl = `http://127.0.0.1:${backendPort}/api/v1`;
const frontendDistDir = ".next-playwright";
const useExternalServers = process.env.PLAYWRIGHT_USE_EXTERNAL_SERVERS === "1";

const frontendEnv = [
  `PLAYWRIGHT_DIST_DIR=${frontendDistDir}`,
  `NEXT_PUBLIC_API_BASE_URL=${apiBaseUrl}`,
  `INTERNAL_API_BASE_URL=${apiBaseUrl}`,
].join(" ");

export default defineConfig({
  testDir: "./tests",
  outputDir: "test-results",
  snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
  fullyParallel: false,
  reporter: "line",
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry",
    viewport: { width: 1440, height: 1400 },
  },
  webServer: useExternalServers
    ? undefined
    : [
        {
          command: `node tests/mock-api-server.mjs`,
          url: `http://127.0.0.1:${backendPort}/api/v1/health`,
          reuseExistingServer: true,
          cwd: ".",
          timeout: 30000,
        },
        {
          command: [
            `${frontendEnv} npm run dev -- --hostname 127.0.0.1 --port ${frontendPort}`,
          ].join(" && "),
          url: `http://127.0.0.1:${frontendPort}`,
          reuseExistingServer: true,
          timeout: 120000,
        },
      ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
