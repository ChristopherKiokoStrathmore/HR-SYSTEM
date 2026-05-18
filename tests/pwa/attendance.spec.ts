import { test, expect } from '@playwright/test'

test.describe('PWA — Attendance', () => {
  test('attendance page loads', async ({ page }) => {
    await page.goto('/attendance')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('button', { hasText: /check in|check out|completed/i }).first()).toBeVisible({ timeout: 15_000 })
  })

  test('check-in or check-out button updates the page', async ({ page }) => {
    await page.goto('/attendance')

    const activeButton = page.getByRole('button', { name: /check in|check out|completed/i }).first()
    await expect(activeButton).toBeVisible({ timeout: 15_000 })

    if (await activeButton.isEnabled().catch(() => false)) {
      const responsePromise = page.waitForResponse((response) =>
        response.url().includes('/api/me/attendance') && response.request().method() === 'POST'
      )

      await activeButton.click()

      const response = await responsePromise
      expect(response.status()).toBe(200)
      await expect(page.getByRole('button', { name: /check out|completed/i }).first()).toBeVisible({ timeout: 20_000 })
    } else {
      await expect(activeButton).toHaveText(/completed/i)
    }

    await expect(page.locator('text=/\\d{2}:\\d{2}/').first()).toBeVisible({ timeout: 15_000 })
  })

  test('weekly attendance history renders day chips when records exist', async ({ page }) => {
    await page.goto('/attendance')

    const chips = page.locator('div').filter({ hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/i })
    await expect(chips.first()).toBeVisible({ timeout: 15_000 })
  })
})
