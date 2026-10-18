import { defineConfig, devices } from "@playwright/test";

const devUrl = "http://127.0.0.1:5173/Catalogfore/";
const previewUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: previewUrl || devUrl,
    trace: "retain-on-failure",
  },
  webServer: previewUrl
    ? undefined
    : {
        command: "npm run dev",
        url: devUrl,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    { name: "desktop", grepInvert: /@mobile/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
