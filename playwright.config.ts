import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['html', { outputFolder: 'playwright-report/html', open: 'never' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    // ── Auth setup ──────────────────────────────────────────────────────────────
    {
      name: 'dashboard-setup',
      testMatch: '**/setup/dashboard.setup.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'pwa-setup',
      testMatch: '**/setup/pwa.setup.ts',
      use: { ...devices['Pixel 5'], baseURL: 'http://localhost:3001' },
    },

    // ── Dashboard tests ────────────────────────────────────────────────────────
    {
      name: 'dashboard',
      testMatch: '**/dashboard/**/*.spec.ts',
      dependencies: ['dashboard-setup'],
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
        storageState: 'tests/.auth/dashboard.json',
      },
    },

    // ── PWA tests ──────────────────────────────────────────────────────────────
    {
      name: 'pwa',
      testMatch: '**/pwa/**/*.spec.ts',
      dependencies: ['pwa-setup'],
      use: {
        ...devices['Pixel 5'],
        baseURL: 'http://localhost:3001',
        storageState: 'tests/.auth/pwa.json',
      },
    },

    // ── UAT end-to-end tests across all apps ─────────────────────────────────
    {
      name: 'uat',
      testMatch: '**/uat/**/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3002',
      },
    },
  ],
})
