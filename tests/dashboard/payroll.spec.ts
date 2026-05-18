import { test, expect } from '@playwright/test'

test.describe('Payroll', () => {
  test('payroll page loads', async ({ page }) => {
    await page.goto('/payroll')
    await expect(page.getByText('Payroll').first()).toBeVisible({ timeout: 15_000 })
  })

  test('create a new payroll run', async ({ page }) => {
    await page.goto('/payroll')

    // Button text is "New Run" (with Plus icon)
    const newRunBtn = page.getByRole('button', { name: 'New Run' })
    await expect(newRunBtn).toBeVisible({ timeout: 15_000 })
    await newRunBtn.click()

    // Modal opens with title "New Payroll Run"
    await expect(page.getByText('New Payroll Run')).toBeVisible()

    const modal = page.getByRole('dialog')
    const existingRuns = await page.locator('table tbody tr').allTextContents()

    let selectedMonth = 12
    let selectedYear = 2099
    for (let year = 2099; year <= 2199; year++) {
      for (let month = 1; month <= 12; month++) {
        const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
          new Date(year, month - 1, 1)
        )
        if (!existingRuns.some((text) => text.includes(label))) {
          selectedMonth = month
          selectedYear = year
          break
        }
      }
      if (selectedYear === year) break
    }

    await modal.locator('select').selectOption(String(selectedMonth))
    await modal.locator('input[type="number"]').fill(String(selectedYear))

    await page.getByRole('button', { name: 'Create Run' }).click()

    // Wait for modal to close (occurs on both success and error in the component)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 20_000 })
  })
})
