import { test, expect } from '@playwright/test'

const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().split('T')[0]
const DAY_AFTER = new Date(Date.now() + 2 * 86_400_000).toISOString().split('T')[0]

test.describe('PWA — Leave', () => {
  test('leave page loads with balance cards', async ({ page }) => {
    await page.goto('/leave')
    await expect(page.getByRole('button', { name: /request leave/i })).toBeVisible({ timeout: 20_000 })
  })

  test('leave form validates end date and reason', async ({ page }) => {
    await page.goto('/leave')

    const requestBtn = page.getByRole('button', { name: /request leave/i })
    await requestBtn.click()

    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 10_000 })

    await drawer.locator('input[type="date"]').nth(0).fill(DAY_AFTER)
    await drawer.locator('input[type="date"]').nth(1).fill(TOMORROW)
    await drawer.locator('textarea').fill('Too short')

    await drawer.locator('button[type="submit"]').click()

    await expect(drawer.getByText(/end date must be after start date/i)).toBeVisible({ timeout: 10_000 })
    await expect(drawer.getByText(/at least 10 characters/i)).toBeVisible({ timeout: 10_000 })
  })

  test('submit a sick leave request', async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto('/leave')
    const reason = `Flu follow-up and rest at home for recovery (${Date.now()})`

    const requestBtn = page.getByRole('button', { name: /request leave/i })
    await expect(requestBtn).toBeVisible({ timeout: 15_000 })
    await requestBtn.click()

    // Vaul drawer renders with role="dialog"
    const drawer = page.getByRole('dialog')
    await expect(drawer).toBeVisible({ timeout: 10_000 })

    // Leave type select (first select inside dialog)
    await drawer.locator('select').first().selectOption('sick')

    // Date inputs scoped to dialog
    await drawer.locator('input[type="date"]').nth(0).fill(TOMORROW)
    await drawer.locator('input[type="date"]').nth(1).fill(DAY_AFTER)

    // Reason textarea
    await drawer.locator('textarea').fill(reason)

    // Wait for button to be enabled (form validation) before submit
    const submitBtn = drawer.locator('button[type="submit"]')
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    
    // Submit button (type="submit" inside the dialog form)
    const responsePromise = page.waitForResponse((response) => response.url().includes('/api/me/leave') && response.request().method() === 'POST')
    await submitBtn.click()

    const response = await responsePromise
    expect(response.status(), 'leave submit should return 201 Created').toBe(201)

    await expect(page.getByText(/leave request submitted/i)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/sick leave/i).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(new RegExp(`${TOMORROW}.*${DAY_AFTER}`)).first()).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 20_000 })
  })

  test('leave page renders after submitting a request', async ({ page }) => {
    await page.goto('/leave')
    // The page always renders: balance ring section + request button
    await expect(page.getByRole('button', { name: /request leave/i })).toBeVisible({ timeout: 20_000 })
    // My Requests section heading (key text on the page)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
