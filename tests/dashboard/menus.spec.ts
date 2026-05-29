import { test, expect } from '@playwright/test'

test.describe('Dashboard menus (UAT)', () => {
  test('dashboard home loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Workforce Overview').first()).toBeVisible({ timeout: 15_000 })
  })

  test('onboarding page loads', async ({ page }) => {
    await page.goto('/onboarding')
    await expect(page.getByText('Onboarding').first()).toBeVisible({ timeout: 15_000 })
  })

  test('background checks page loads', async ({ page }) => {
    await page.goto('/background-checks')
    await expect(page.getByText('Background Checks').first()).toBeVisible({ timeout: 15_000 })
  })

  test('leave management page loads', async ({ page }) => {
    await page.goto('/leave')
    await expect(page.getByText('Leave Management').first()).toBeVisible({ timeout: 15_000 })
  })

  test('attendance page loads', async ({ page }) => {
    await page.goto('/attendance')
    await expect(page.getByText('Attendance').first()).toBeVisible({ timeout: 15_000 })
  })

  test('performance page loads', async ({ page }) => {
    await page.goto('/performance')
    await expect(page.getByText('Performance').first()).toBeVisible({ timeout: 15_000 })
  })

  test('training page loads', async ({ page }) => {
    await page.goto('/training')
    await expect(page.getByText('Training').first()).toBeVisible({ timeout: 15_000 })
  })

  test('medical records page loads', async ({ page }) => {
    await page.goto('/medical')
    await expect(page.getByText('Medical Records').first()).toBeVisible({ timeout: 15_000 })
  })

  test('reports page loads', async ({ page }) => {
    await page.goto('/reports')
    await expect(page.getByText('Reports & Analytics').first()).toBeVisible({ timeout: 15_000 })
  })

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Settings').first()).toBeVisible({ timeout: 15_000 })
  })
})
