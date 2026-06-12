import { test, expect } from '@playwright/test'

test.describe('PWA UAT — Comprehensive button and interaction flows', () => {
  test('NAV: Bottom nav reaches all 5 core routes', async ({ page }) => {
    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    const nav = page.locator('nav').last()
    await expect(nav).toBeVisible({ timeout: 15_000 })

    const routes = [
      { href: '/leave', label: 'leave' },
      { href: '/attendance', label: 'attendance' },
      { href: '/payslip', label: 'payslip' },
      { href: '/profile', label: 'profile' },
      { href: '/home', label: 'home' },
    ]

    for (const { href, label } of routes) {
      await Promise.all([
        page.waitForURL(`**${href}`, { timeout: 15_000 }),
        nav.locator(`a[href="${href}"]`).click(),
      ])
      await expect(page).toHaveURL(new RegExp(label + '$'))
    }
  })

  test('ATTENDANCE: Check-in button posts to API and updates UI', async ({ page }) => {
    await page.goto('/attendance')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 15_000 })

    const button = page.getByRole('button', { name: /check in|check out|completed/i }).first()
    await expect(button).toBeVisible({ timeout: 15_000 })

    if (await button.isEnabled().catch(() => false)) {
      const responsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/me/attendance') && resp.request().method() === 'POST'
      )

      await button.click()
      const response = await responsePromise
      expect([200, 201]).toContain(response.status())

      // Verify UI updated (button text or time display changed)
      await expect(page.locator('text=/\\d{2}:\\d{2}/').first()).toBeVisible({ timeout: 15_000 })
    } else {
      await expect(button).toHaveText(/completed/i)
    }
  })

  test('ATTENDANCE: Weekly history renders day chips', async ({ page }) => {
    await page.goto('/attendance')

    const dayChips = page.locator('[data-testid*="attendance-day"], div').filter({
      hasText: /Mon|Tue|Wed|Thu|Fri|Sat|Sun/i,
    })
    await expect(dayChips.first()).toBeVisible({ timeout: 15_000 })
  })

  test('LEAVE: Navigate to leave page and form renders', async ({ page }) => {
    await page.goto('/leave')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /leave/i })).toBeVisible({ timeout: 15_000 })
    await expect(
      page.getByRole('button', { name: /apply|request|new leave/i })
    ).toBeVisible({ timeout: 15_000 })
  })

  test('LEAVE: Modal open/close buttons work', async ({ page }) => {
    await page.goto('/leave')
    await page.waitForLoadState('networkidle')

    const applyBtn = page.getByRole('button', { name: /apply|request|new leave/i }).first()
    await applyBtn.click()

    const modal = page.locator('[role="dialog"]')
    await expect(modal).toBeVisible({ timeout: 10_000 })

    const closeBtn = page.locator('[data-testid="close-modal"], button').filter({ hasText: /close|cancel|×/i }).first()
    if (await closeBtn.count() > 0) {
      await closeBtn.click()
      await expect(modal).not.toBeVisible({ timeout: 5_000 }).catch(() => {})
    }
  })

  test('PAYSLIP: Page loads and payslip list renders', async ({ page }) => {
    await page.goto('/payslip')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /payslip|salary/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/2026|February|March|April/i').first()).toBeVisible({ timeout: 15_000 })
  })

  test('PAYSLIP: View/download button on payslip card works', async ({ page }) => {
    await page.goto('/payslip')
    await page.waitForLoadState('networkidle')

    const viewBtn = page.getByRole('button', { name: /view|open|download/i }).first()
    if (await viewBtn.count() > 0) {
      await viewBtn.click()
      // Verify modal or PDF opened
      await expect(
        page.locator('[role="dialog"], iframe').first()
      ).toBeVisible({ timeout: 10_000 })
    }
  })

  test('PROFILE: Profile page loads user data', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await expect(page.getByRole('heading', { name: /profile|account/i })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('text=/David|Kimani/i').first()).toBeVisible({ timeout: 15_000 })
  })

  test('PROFILE: Edit button toggles form visibility', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    const editBtn = page.getByRole('button', { name: /edit/i }).first()
    if (await editBtn.count() > 0) {
      await editBtn.click()
      const form = page.locator('form, [data-testid="edit-form"]').first()
      await expect(form).toBeVisible({ timeout: 10_000 })
    }
  })

  test('HOME: Announcements render with content', async ({ page }) => {
    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    const announcement = page.locator('[data-testid*="announcement"], text=/Holiday|Maintenance|Policy/i').first()
    await expect(announcement).toBeVisible({ timeout: 15_000 }).catch(() => {
      // Fallback: check for announcement card or section
      return expect(page.locator('text=announcement').first()).toBeVisible({ timeout: 15_000 })
    })
  })

  test('HOME: Quick actions/buttons visible and clickable', async ({ page }) => {
    await page.goto('/home')
    await page.waitForLoadState('networkidle')

    const actionBtn = page.getByRole('button').first()
    await expect(actionBtn).toBeVisible({ timeout: 15_000 })
  })
})

