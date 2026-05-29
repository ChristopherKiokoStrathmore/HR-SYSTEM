import { test, expect } from '@playwright/test'

const menuItems = [
  { label: 'Dashboard', href: '/', expected: 'Workforce Overview' },
  { label: 'Employees', href: '/employees', expected: 'Employees' },
  { label: 'Recruitment', href: '/recruitment', expected: 'Recruitment' },
  { label: 'Onboarding', href: '/onboarding', expected: 'Onboarding' },
  { label: 'Background Checks', href: '/background-checks', expected: 'Background Checks' },
  { label: 'Leave', href: '/leave', expected: 'Leave Management' },
  { label: 'Attendance', href: '/attendance', expected: 'Attendance' },
  { label: 'Performance', href: '/performance', expected: 'Performance' },
  { label: 'Training', href: '/training', expected: 'Training' },
  { label: 'Medical', href: '/medical', expected: 'Medical Records' },
  { label: 'Reports', href: '/reports', expected: 'Reports & Analytics' },
  { label: 'Settings', href: '/settings', expected: 'Settings' },
]

test.describe('Sidebar navigation', () => {
  test('clicking sidebar links navigates to corresponding pages', async ({ page }) => {
    await page.goto('/')

    // Ensure sidebar is rendered
    await expect(page.getByRole('link', { name: 'Employees' }).first()).toBeVisible({ timeout: 15_000 })

    for (const item of menuItems) {
      const link = page.getByRole('link', { name: item.label }).first()
      await expect(link).toBeVisible()

      if (item.href !== '/') {
        await Promise.all([
          page.waitForURL(`**${item.href}**`, { timeout: 15_000 }),
          link.click(),
        ])
      } else {
        await link.click()
      }

      // Assert page header / identifying text is visible
      await expect(page.getByText(item.expected).first()).toBeVisible({ timeout: 15_000 })
    }
  })
})
