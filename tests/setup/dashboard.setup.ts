import { test as setup, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../.auth/dashboard.json')

setup('authenticate as HR admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/login')
  await expect(page.locator('#email')).toBeVisible({ timeout: 20_000 })

  await page.locator('#email').fill(process.env.DASHBOARD_EMAIL ?? 'hr@demo.co.ke')
  await page.locator('#password').fill(process.env.DASHBOARD_PASSWORD ?? 'Demo1234!')
  await page.locator('button[type="submit"]').click()

  // Wait until we leave the login page (dashboard or redirect) — this confirms auth worked
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })

  // Wait for page to fully hydrate (employee list or dashboard loads)
  await page.waitForLoadState('networkidle')

  // Small delay to ensure state is persisted
  await page.waitForTimeout(500)

  await page.context().storageState({ path: AUTH_FILE })
})
