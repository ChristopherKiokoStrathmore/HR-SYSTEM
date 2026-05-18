import { test, expect } from '@playwright/test'

test.describe('PWA — Home', () => {
  test('home page loads', async ({ page }) => {
    const meResponse = page.waitForResponse((response) =>
      response.url().includes('/api/me') && response.request().method() === 'GET'
    )
    const announcementsResponse = page.waitForResponse((response) =>
      response.url().includes('/api/me/announcements') && response.request().method() === 'GET'
    )

    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    const [me, announcements] = await Promise.all([meResponse, announcementsResponse])
    expect(me.status()).toBe(200)
    expect(announcements.status()).toBe(200)

    await expect(page.locator('a[href="/leave"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('a[href="/attendance"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('a[href="/payslip"]').first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('a[href="/profile"]').first()).toBeVisible({ timeout: 15_000 })

    // Home should show either seeded announcements or a no-data placeholder.
    const seededAnnouncement = page.getByText(/Wellness Friday Check-in|Public Holiday/i).first()
    const noAnnouncements = page.getByText(/no announcements/i).first()
    await expect(seededAnnouncement.or(noAnnouncements)).toBeVisible({ timeout: 15_000 })
  })

  test('request leave quick action opens leave page', async ({ page }) => {
    await page.goto('/home')

    const link = page.locator('a[href="/leave"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.scrollIntoViewIfNeeded()

    await Promise.all([
      page.waitForURL('**/leave', { timeout: 15_000 }),
      link.click(),
    ])
  })

  test('check in quick action opens attendance page', async ({ page }) => {
    await page.goto('/home')

    const link = page.locator('a[href="/attendance"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.scrollIntoViewIfNeeded()

    await Promise.all([
      page.waitForURL('**/attendance', { timeout: 15_000 }),
      link.click(),
    ])
  })

  test('payslip quick action opens payslip page', async ({ page }) => {
    await page.goto('/home')

    const link = page.locator('a[href="/payslip"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.scrollIntoViewIfNeeded()

    await Promise.all([
      page.waitForURL('**/payslip', { timeout: 15_000 }),
      link.click(),
    ])
  })

  test('profile quick action opens profile page', async ({ page }) => {
    await page.goto('/home')

    const link = page.locator('a[href="/profile"]').first()
    await expect(link).toBeVisible({ timeout: 15_000 })
    await link.scrollIntoViewIfNeeded()

    await Promise.all([
      page.waitForURL('**/profile', { timeout: 15_000 }),
      link.click(),
    ])
  })
})
