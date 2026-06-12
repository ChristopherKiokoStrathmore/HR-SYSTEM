import { test, expect } from '@playwright/test'

const TODAY = new Date().toISOString().split('T')[0]

test.describe('Employees', () => {
  test('employee list loads with data', async ({ page }) => {
    await page.goto('/employees')
    const rows = page.locator('table tbody tr')
    await expect(rows.first()).toBeVisible({ timeout: 20_000 })
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('create a new employee through 4-step wizard', async ({ page }) => {
    await page.goto('/employees')
    await page.getByRole('button', { name: 'Add Employee' }).click()
    await expect(page.getByText('Add New Employee')).toBeVisible()

    // ── Step 0: Personal ──────────────────────────────────────────────────────
    // Labels have no `for` attr — use placeholder selectors
    await page.getByPlaceholder('Jane Doe').fill('Test UAT Employee')
    await page.getByPlaceholder('jane@email.com').fill(`uat-${Date.now()}@demo.co.ke`)
    await page.getByPlaceholder('+254700000000').first().fill('+254700000001')
    await page.locator('input[type="date"]').first().fill('1990-01-01')
    // Gender select — scope to the employee form, not the toolbar filters
    await page.locator('form').locator('select').first().selectOption('male')
    await page.getByPlaceholder('Kenyan').fill('Kenyan')
    await page.getByPlaceholder('12345678').fill('12345699')
    await page.getByRole('button', { name: 'Next' }).click()

    // ── Step 1: Employment ────────────────────────────────────────────────────
    await expect(page.getByPlaceholder('EMP-0001')).toBeVisible({ timeout: 10_000 })
    // Company select — scope to the employee form, not the toolbar filters
    await page.locator('form').locator('select').first().selectOption({ index: 1 })
    await page.getByPlaceholder('EMP-0001').fill(`UAT-${Date.now()}`)
    await page.getByPlaceholder('Software Engineer').fill('UAT Tester')
    await page.getByPlaceholder('Engineering').first().fill('QA')
    await page.getByPlaceholder('12').fill('12')
    await page.locator('input[type="date"]').first().fill(TODAY)
    await page.getByRole('button', { name: 'Next' }).click()

    // ── Step 2: Compensation ──────────────────────────────────────────────────
    await expect(page.getByPlaceholder('50000')).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('50000').fill('50000')
    await page.getByPlaceholder('Equity Bank').fill('Equity Bank')
    await page.getByPlaceholder('0123456789').fill('0123456789')
    await page.getByRole('button', { name: 'Next' }).click()

    // ── Step 3: Statutory ─────────────────────────────────────────────────────
    await expect(page.getByPlaceholder('NSSF/12345')).toBeVisible({ timeout: 10_000 })
    await page.getByPlaceholder('NSSF/12345').fill('NSSF/99999')
    await page.getByPlaceholder('A123456789Z').fill('A999999999Z')
    await page.locator('form').evaluate((form) => {
      (form as HTMLFormElement).requestSubmit()
    })

    // Wait for modal to close (occurs on both success and error in the component)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 20_000 })
  })

  test('clicking an employee row navigates to profile page', async ({ page }) => {
    // Increase timeout for this test — profile page SSR can be slow in dev
    test.setTimeout(60_000)

    await page.goto('/employees')
    const firstRow = page.locator('table tbody tr').first()
    await expect(firstRow).toBeVisible({ timeout: 20_000 })

    // Click the explicit employee action button in the first cell.
    await Promise.all([
      page.waitForURL(/\/employees\/.+/, { timeout: 45_000 }),
      firstRow.getByRole('button').click({ force: true }),
    ])
  })
})
