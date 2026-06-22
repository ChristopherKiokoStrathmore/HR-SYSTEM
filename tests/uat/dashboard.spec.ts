import { test, expect } from '@playwright/test'
import { DASHBOARD_URL, appUrl, signIn } from './uat-helpers'

const goto = (page: import('@playwright/test').Page, url: string) =>
  page.goto(url, { waitUntil: 'domcontentloaded' })

test.describe('UAT: dashboard admin profile', () => {
  test('admin can review core dashboard sections', async ({ page }) => {
    await signIn(page, appUrl(DASHBOARD_URL, '/login'), 'carol.njeri@sheerlogic.co.ke', 'HRAdmin@2026!')

    await goto(page, appUrl(DASHBOARD_URL, '/'))
    await expect(page.getByText('Active Employees')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Pending Leave Approvals')).toBeVisible({ timeout: 20_000 })

    await goto(page, appUrl(DASHBOARD_URL, '/employees'))
    await expect(page.getByRole('heading', { name: /employees/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 20_000 })

    await goto(page, appUrl(DASHBOARD_URL, '/performance'))
    await expect(page.getByRole('heading', { name: /performance/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/\d+ reviews on record/i)).toBeVisible({ timeout: 20_000 })

    await goto(page, appUrl(DASHBOARD_URL, '/attendance'))
    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Attendance Rate').first()).toBeVisible({ timeout: 20_000 })

    await goto(page, appUrl(DASHBOARD_URL, '/medical'))
    await expect(page.getByRole('heading', { name: 'Medical Records', exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/\d+ records/i)).toBeVisible({ timeout: 20_000 })

    await goto(page, appUrl(DASHBOARD_URL, '/recruitment'))
    await expect(page.getByRole('heading', { name: /recruitment/i })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('New Posting')).toBeVisible({ timeout: 20_000 })
  })
})
