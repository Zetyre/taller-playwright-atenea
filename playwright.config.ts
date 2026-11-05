import { defineConfig, devices } from '@playwright/test';
import { frontendBaseUrl } from './utils/urls';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  // One retry on CI surfaces flaky tests as "flaky" in the report without hiding real failures.
  // No retries locally: a failure while developing should be a failure.
  retries: isCI ? 1 : 0,
  // Every test creates its own users, so the suite is safe to run in parallel.
  // Locally the cap is 30% of cores: more than ~6 concurrent Firefox instances on a Windows dev machine
  // starts crashing Firefox's software compositor. CI runs one browser per job, so it keeps the default.
  workers: isCI ? undefined : '30%',
  // On CI each browser runs in its own job and writes a blob report; a later job merges them into one HTML report.
  // The known-defects reporter lists @known-bug tests apart from real passes and fails the run when one fails for a
  // reason other than the one it declares.
  reporter: isCI
    ? [['github'], ['list'], ['blob'], ['./reporters/known-defects.ts']]
    : [['list'], ['html', { open: 'never' }], ['./reporters/known-defects.ts']],
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: frontendBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'chromium',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testDir: './tests/ui',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testDir: './tests/ui',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
