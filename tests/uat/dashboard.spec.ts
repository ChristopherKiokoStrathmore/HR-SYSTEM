import { test, expect } from '@playwright/test'
import { DASHBOARD_URL, appUrl, signIn } from './uat-helpers'

test.describe('UAT: dashboard admin profile', () => {
  test('admin can review core dashboard sections', async ({ page }) => {
    await signIn(page, appUrl(DASHBOARD_URL, '/login'), 'hr@demo.co.ke', 'Demo1234!')

    await page.goto(appUrl(DASHBOARD_URL, '/'))
    await expect(page.getByText('Sheer Logic HR')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Active Employees')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Pending Leave')).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(DASHBOARD_URL, '/employees'))
    await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(DASHBOARD_URL, '/performance'))
    await expect(page.getByRole('heading', { name: /performance/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/\d+ reviews on record/i)).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(DASHBOARD_URL, '/attendance'))
    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 20_000 })
    await page.getByRole('textbox').fill('2026-05-20')
    await expect(page.getByText('1 present')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('1 location today')).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(DASHBOARD_URL, '/medical'))
    await expect(page.getByRole('heading', { name: /medical records/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/\d+ records/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('David Kimani')).toBeVisible({ timeout: 20_000 })

    await page.goto(appUrl(DASHBOARD_URL, '/recruitment'))
    await expect(page.getByRole('heading', { name: /recruitment/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('New Posting')).toBeVisible({ timeout: 20_000 })
  })
})
