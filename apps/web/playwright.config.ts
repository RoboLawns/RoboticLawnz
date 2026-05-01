import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the customer-facing web app.
 *
 * `pnpm test:e2e` boots the Next.js dev server and runs the suite against it.
 * The API + Postgres + Redis must already be running locally — start them via
 * `make infra-up && make api-dev` from the repo root. CI seeds an isolated
 * test DB; the workflow file lives at `.github/workflows/e2e.yml` (TODO).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "en-US",
    timezoneId: "America/New_York",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 15"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // Disable Clerk in tests — anonymous flow is enough for the happy path.
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      // Use a token-less map so the page falls back to the manual area input.
      NEXT_PUBLIC_MAPBOX_TOKEN: "",
    },
  },
});
