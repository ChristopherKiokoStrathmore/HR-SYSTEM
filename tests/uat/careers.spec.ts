import { test, expect } from '@playwright/test'
import { CAREERS_URL, appUrl } from './uat-helpers'

test.describe('UAT: careers applicant profile', () => {
  test('browse jobs, apply, and track the application', async ({ page }) => {
    const runId = Date.now().toString(36)
    const applicantName = `UAT Candidate ${runId}`
    const applicantEmail = `uat-${runId}@demo.co.ke`

    await page.goto(appUrl(CAREERS_URL, '/jobs'))
    await expect(page.getByText('Job Centre')).toBeVisible({ timeout: 20_000 })

    const firstJob = page.getByRole('link', { name: /view & apply/i }).first()
    await expect(firstJob).toBeVisible({ timeout: 20_000 })
    await Promise.all([
      page.waitForURL(/\/jobs\/[A-Za-z0-9-]+$/, { timeout: 20_000 }),
      firstJob.click(),
    ])

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    await page.locator('#apply').scrollIntoViewIfNeeded()
    await page.getByPlaceholder('Jane Wanjiku').fill(applicantName)
    await page.getByPlaceholder('jane@example.com').fill(applicantEmail)
    await page.getByPlaceholder('+254 7XX XXX XXX').fill('+254700000111')
    await page.getByPlaceholder('Tell us why you\'re a great fit for this role…').fill(
      'This is a UAT submission created by the automated cross-app journey.'
    )

    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/apply') && response.request().method() === 'POST'),
      page.getByRole('button', { name: /submit application/i }).click(),
    ])

    await expect(page.getByText('Application received!')).toBeVisible({ timeout: 20_000 })

    const trackerHref = await page.getByRole('link', { name: /open application tracker/i }).getAttribute('href')
    expect(trackerHref).toMatch(/^\/track\//)

    await page.goto(appUrl(CAREERS_URL, trackerHref!))
    await expect(page.getByText(applicantEmail)).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText(/Under Review/i)).toBeVisible({ timeout: 20_000 })
  })
})
