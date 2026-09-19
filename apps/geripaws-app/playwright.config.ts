import { defineConfig, devices } from '@playwright/test';

// Runs against the live Supabase project (same one `pnpm web` talks to via
// .env) — there is no local/Docker Supabase stack yet. Each test creates and
// deletes its own disposable account via the app's own sign-up/delete-account
// flows (see e2e/helpers/accounts.ts), the same pattern verified by hand
// during the UX audit this suite grew out of. Because these tests touch a
// real backend, they're deliberately not wired into the PR-triggered
// test.yml workflow yet — run locally, or via a manually-triggered workflow.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // disposable accounts are cheap, but serial keeps Supabase Auth well under any rate limit
  forbidOnly: !!process.env.CI,
  // A live remote Supabase project plus a dev-mode Metro server occasionally
  // produce a slow request that pushes a test's *cleanup* step (never an
  // assertion under test, in every case seen so far) past the timeout — a
  // real characteristic of this backend choice, not a masked bug. One retry
  // locally too, not just in CI.
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  // Generous relative to a typical Playwright suite — every test here does
  // real work against a live remote Supabase project plus a dev-mode (not
  // production-built) Metro server, both of which have real latency and
  // occasional rebuild-triggered slow requests that a mocked-backend suite
  // wouldn't see.
  timeout: 90_000,
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
