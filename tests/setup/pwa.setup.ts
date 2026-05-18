import { test as setup, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../.auth/pwa.json')

setup('authenticate as employee (David)', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })

  await page.goto('/login')
  await expect(page.locator('#email')).toBeVisible({ timeout: 20_000 })

  await page.locator('#email').fill(process.env.PWA_EMAIL ?? 'david@demo.co.ke')
  await page.locator('#password').fill(process.env.PWA_PASSWORD ?? 'Demo1234!')
  await page.locator('button[type="submit"]').click()

  // PWA redirects to /home after successful login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
