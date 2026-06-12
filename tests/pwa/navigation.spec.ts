import { test, expect } from '@playwright/test'

test.describe('PWA — Navigation', () => {
  test('bottom nav opens all core sections', async ({ page }) => {
    await page.goto('/home')

    const nav = page.locator('nav').last()
    await expect(nav).toBeVisible({ timeout: 15_000 })

    await Promise.all([
      page.waitForURL('**/leave', { timeout: 15_000 }),
      nav.locator('a[href="/leave"]').click(),
    ])

    await Promise.all([
      page.waitForURL('**/attendance', { timeout: 15_000 }),
      nav.locator('a[href="/attendance"]').click(),
    ])

    await Promise.all([
      page.waitForURL('**/payslip', { timeout: 15_000 }),
      nav.locator('a[href="/payslip"]').click(),
    ])

    await Promise.all([
      page.waitForURL('**/profile', { timeout: 15_000 }),
      nav.locator('a[href="/profile"]').click(),
    ])

    await Promise.all([
      page.waitForURL('**/home', { timeout: 15_000 }),
      nav.locator('a[href="/home"]').click(),
    ])

    await expect(page).toHaveURL(/\/home$/)
  })
})
