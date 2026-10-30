import { randomBytes } from "node:crypto";
import { defineConfig } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

// Tests use an intentionally unreachable endpoint and fake signing credentials.
// This lets the API mint/verifiable test tokens without touching a real LiveKit project.
const e2eLiveKitEnv = {
  LIVEKIT_URL: "wss://livekit.test.invalid",
  LIVEKIT_API_KEY: "mhaf-e2e-test-key",
  LIVEKIT_API_SECRET: "mhaf-e2e-test-secret",
};
const e2eAuthEnv = { MHAF_E2E_AUTH_HARNESS_SECRET: randomBytes(32).toString("hex") };
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
    command: "bun run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    env: { ...e2eLiveKitEnv, ...e2eAuthEnv },
  },
});
