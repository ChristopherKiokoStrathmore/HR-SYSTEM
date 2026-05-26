import { test, expect } from '@playwright/test'

const CAREERS_URL = process.env.CAREERS_BASE_URL ?? process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
const DASHBOARD_URL = process.env.DASHBOARD_BASE_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000'
const PWA_URL = process.env.PWA_BASE_URL ?? process.env.NEXT_PUBLIC_PWA_URL ?? 'http://localhost:3001'

function appUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

async function signIn(page: import('@playwright/test').Page, loginUrl: string, email: string, password: string) {
  await page.goto(loginUrl)
  await expect(page.locator('#email')).toBeVisible({ timeout: 20_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}

test.describe('UAT: careers, dashboard, and PWA', () => {
  test('candidate application flows from careers into dashboard recruitment', async ({ page }) => {
    const runId = Date.now().toString(36)
    const applicantName = `UAT Candidate ${runId}`
    const applicantEmail = `uat-${runId}@demo.co.ke`

    await test.step('browse careers jobs and open a posting', async () => {
      await page.goto(appUrl(CAREERS_URL, '/jobs'))
      await expect(page.getByText('Job Centre')).toBeVisible({ timeout: 20_000 })

      const firstJob = page.getByRole('link', { name: /view & apply/i }).first()
      await expect(firstJob).toBeVisible({ timeout: 20_000 })
      await Promise.all([
        page.waitForURL(/\/jobs\/[A-Za-z0-9-]+$/, { timeout: 20_000 }),
        firstJob.click(),
      ])

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 20_000 })
    })

    await test.step('submit a portal application', async () => {
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
      await expect(page.getByRole('link', { name: /open application tracker/i })).toBeVisible({ timeout: 20_000 })
    })

    await test.step('open the public tracker', async () => {
      const trackerHref = await page.getByRole('link', { name: /open application tracker/i }).getAttribute('href')
      expect(trackerHref).toMatch(/^\/track\//)

      await page.goto(appUrl(CAREERS_URL, trackerHref!))
      await expect(page.getByText(applicantEmail)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText(/Under Review/i)).toBeVisible({ timeout: 20_000 })
    })

    await test.step('verify the candidate appears in dashboard recruitment', async () => {
      await signIn(page, appUrl(DASHBOARD_URL, '/login'), 'hr@demo.co.ke', 'Demo1234!')
      await page.goto(appUrl(DASHBOARD_URL, '/recruitment'))
      await expect(page.getByText('Live Applications')).toBeVisible({ timeout: 20_000 })

      const applicantCard = page.getByRole('button', { name: new RegExp(applicantName) }).first()
      await expect(applicantCard).toBeVisible({ timeout: 20_000 })
      await applicantCard.click()

      await expect(page.getByText(applicantEmail)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('link', { name: /candidate tracker page/i })).toBeVisible({ timeout: 20_000 })
    })
  })

  test('employee journey works in the PWA', async ({ page }) => {
    await test.step('sign in and verify home screen', async () => {
      await signIn(page, appUrl(PWA_URL, '/login'), 'david@demo.co.ke', 'Demo1234!')
      await expect(page).toHaveURL(/\/home$/)
      await expect(page.locator('a[href="/leave"]').first()).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('a[href="/attendance"]').first()).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('a[href="/payslip"]').first()).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('a[href="/profile"]').first()).toBeVisible({ timeout: 20_000 })
    })

    await test.step('open attendance from quick actions', async () => {
      const attendanceLink = page.locator('a[href="/attendance"]').first()
      await Promise.all([
        page.waitForURL(/\/attendance$/, { timeout: 20_000 }),
        attendanceLink.click(),
      ])
      await expect(page.getByRole('heading', { name: /attendance/i })).toBeVisible({ timeout: 20_000 })
      await expect(page.getByRole('button', { name: /check in|check out|completed/i }).first()).toBeVisible({ timeout: 20_000 })
    })

    await test.step('return to home and verify navigation remains stable', async () => {
      await page.goto(appUrl(PWA_URL, '/home'))
      await expect(page.locator('a[href="/leave"]').first()).toBeVisible({ timeout: 20_000 })
    })
  })
})
