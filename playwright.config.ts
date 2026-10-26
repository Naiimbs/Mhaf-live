import { defineConfig } from "@playwright/test";

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
    command: "bun run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
