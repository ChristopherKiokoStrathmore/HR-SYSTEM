import { test, expect } from '@playwright/test'
import { PWA_URL, appUrl, signIn } from './uat-helpers'

test.describe('UAT: PWA employee profile', () => {
  test('employee can use the mobile home and core journeys', async ({ page }) => {
    await signIn(page, appUrl(PWA_URL, '/login'), 'david@demo.co.ke', 'Demo1234!')
    await expect(page).toHaveURL(/\/home$/)

    await expect(page.locator('a[href="/leave"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('a[href="/attendance"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('a[href="/payslip"]').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible({ timeout: 20_000 })

    await Promise.all([
      page.waitForURL(/\/attendance$/, { timeout: 20_000 }),
      page.locator('a[href="/attendance"]').first().click(),
    ])
    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /check in|check out|completed/i }).first()).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(PWA_URL, '/home'))
    await Promise.all([
      page.waitForURL(/\/leave$/, { timeout: 20_000 }),
      page.locator('a[href="/leave"]').first().click(),
    ])
    await expect(page.getByRole('heading', { name: /leave/i })).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(PWA_URL, '/profile'))
    await expect(page.getByRole('heading', { name: /profile/i })).toBeVisible({ timeout: 20_000 })
  })
})
