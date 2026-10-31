import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";
import { tmpdir } from "node:os";
import path from "node:path";

loadEnvConfig(process.cwd());

// Tests use an intentionally unreachable endpoint and fake signing credentials.
// This lets the API mint/verifiable test tokens without touching a real LiveKit project.
const e2eLiveKitEnv = {
  LIVEKIT_URL: "wss://livekit.test.invalid",
  LIVEKIT_API_KEY: "mhaf-e2e-test-key",
  LIVEKIT_API_SECRET: "mhaf-e2e-test-secret",
};
const e2eAuthEnv = { MHAF_E2E_AUTH_HARNESS_SECRET: "mhaf-live-playwright-e2e-only-2026-10-31-7f3c9a1e" };
const e2eDataDir = path.join(tmpdir(), `mhaf-live-e2e-${process.pid}`);
Object.assign(process.env, e2eLiveKitEnv, e2eAuthEnv);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: [
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
      ],
    },
  },
  projects: [
    {
      name: "Desktop Edge",
      use: {
        channel: "msedge",
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "Tablet Edge",
      use: {
        channel: "msedge",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "Mobile Edge",
      use: {
        channel: "msedge",
        viewport: { width: 375, height: 667 },
        isMobile: true,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    // Isolate test records from developer and production data. PostgreSQL is not required in this phase.
    env: { ...e2eLiveKitEnv, ...e2eAuthEnv, NODE_ENV: "development", MHAF_DATA_DIR: e2eDataDir, DATABASE_URL: "", INITIAL_HOST_EMAIL: "", INITIAL_HOST_PASSWORD: "", INITIAL_HOST_NAME: "", SEED_DEMO_HOST: "true" },
  },
});
