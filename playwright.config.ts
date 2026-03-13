import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [['list'], ['html', { outputFolder: 'output/playwright/report', open: 'never' }]],
  outputDir: 'output/playwright/test-results',
  use: {
    ...devices['iPhone 12 Pro'],
    browserName: 'chromium',
    baseURL: 'http://localhost:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    testIdAttribute: 'data-testid',
  },
  webServer: {
    command: 'npm run e2e:dev',
    url: 'http://localhost:3100',
    timeout: 120_000,
    reuseExistingServer: false,
  },
});
