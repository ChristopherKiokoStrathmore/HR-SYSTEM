import { test, expect } from '@playwright/test'

test.describe('PWA — Profile', () => {
  test('profile page loads', async ({ page }) => {
    await page.goto('/profile')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('david@demo.co.ke')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/software engineer/i)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/documents/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test('language toggle switches the selected language', async ({ page }) => {
    await page.goto('/profile')

    const languageLabel = page.getByText(/English|Kiswahili/i).first()
    await expect(languageLabel).toBeVisible({ timeout: 15_000 })

    const initialLanguage = (await languageLabel.textContent())?.trim() ?? 'English'
    await page.locator('button').first().click()

    const expectedLanguage = initialLanguage.includes('English') ? 'Kiswahili' : 'English'
    await expect(page.getByText(expectedLanguage).first()).toBeVisible({ timeout: 15_000 })
  })

  test('logout button redirects to login', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('button', { name: /logout/i }).click()

    await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 })
  })
})
