import { test, expect } from '@playwright/test'

test.describe('PWA — Payslips', () => {
  test('payslip page loads', async ({ page }) => {
    await page.goto('/payslip')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /payslip/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/no payslips yet/i)).toHaveCount(0)

    const cards = page.locator('button').filter({
      hasText: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i,
    })
    await expect(cards.first()).toBeVisible({ timeout: 15_000 })
  })

  test('payslip item expands and downloads PDF', async ({ page }) => {
    await page.goto('/payslip')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('button').filter({
      hasText: /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i,
    })
    const firstCard = cards.first()

    await expect(firstCard).toBeVisible({ timeout: 15_000 })
    await firstCard.click()

    await expect(page.getByText(/gross salary/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/net salary/i)).toBeVisible({ timeout: 15_000 })

    const downloadButton = page.getByRole('button', { name: /download pdf/i })
    await expect(downloadButton).toBeVisible({ timeout: 15_000 })

    const downloadPromise = page.waitForEvent('download')
    await downloadButton.click()
    await downloadPromise
  })
})
