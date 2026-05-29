import { test, expect } from '@playwright/test'

test.describe.serial('Rigorous UAT flows', () => {
  test.setTimeout(180_000)

  test('Recruitment: create a job posting and close it', async ({ page }) => {
    const title = `UAT Job ${Date.now()}`

    await page.goto('/recruitment')
    await expect(page.getByText('Recruitment')).toBeVisible()

    // Open create modal
    await page.getByRole('button', { name: 'New Posting' }).click()
    await expect(page.getByText('New Job Posting')).toBeVisible()

    await page.getByPlaceholder('Senior Software Engineer').fill(title)
    await page.getByPlaceholder('Engineering').fill('Engineering')
    await page.locator('form textarea').first().fill('This is a UAT posting created for automated tests. It has enough length.')
    await page.getByPlaceholder('React, TypeScript, Node.js').fill('playwright, uat')
    await page.getByRole('button', { name: 'Create Posting' }).click()

    // Wait for the posting to appear in the list
    await expect(page.getByText(title)).toBeVisible({ timeout: 20_000 })

    // Close (delete) the posting by clicking the trash button on the posting card
    // Accept confirm dialogs
    page.on('dialog', dialog => dialog.accept())

    const card = page.locator('h3', { hasText: title }).first().locator('..')
    // Find the trash button within the card (icon button)
    await card.locator('button').filter({ has: page.locator('svg[aria-hidden="true"]') }).first().click().catch(async () => {
      // Fallback: click the visible trash icon button
      await page.getByRole('button', { name: /trash|close|delete/i }).first().click()
    })

    // Assert the posting no longer visible
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 15_000 })
  })

  test('Background check lifecycle: create via API, review via UI, delete via API', async ({ page, request }) => {
    const ts = Date.now()
    // create API context using saved auth state so requests are authenticated
    const api = await request.newContext({ baseURL: 'http://localhost:3000', storageState: 'tests/.auth/dashboard.json' })

    // Get first company
    const comps = await api.get('/api/companies?pageSize=10')
    const compsJson = await comps.json()
    const companyId = compsJson?.data?.[0]?.id
    test.skip(!companyId, 'No company available to create background check')

    // Get first employee for the company
    const empsRes = await api.get(`/api/employees?companyId=${companyId}&pageSize=1`)
    const empsJson = await empsRes.json()
    const emp = empsJson?.data?.[0]
    test.skip(!emp, 'No employee available')

    // Create background check via API to get id
    const createRes = await api.post('/api/background-checks', {
      data: {
        employee_id: emp.id,
        check_type: 'criminal',
        company_id: companyId,
        notes: `uat-${ts}`,
      },
    })
    const createJson = await createRes.json()
    const createdId = createJson?.data?.id
    expect(createdId).toBeTruthy()

    // Visit UI and find the created check by employee name, then open Review modal
    await page.goto('/background-checks')
    await expect(page.getByText('Background Checks')).toBeVisible()

    // Locate row by employee name and click Review
    const row = page.getByText(emp.user?.full_name ?? emp.full_name).first()
    await expect(row).toBeVisible({ timeout: 20_000 })
    const reviewBtn = row.locator('..').locator('button', { hasText: 'Review' }).first()
    if (await reviewBtn.isVisible()) {
      await reviewBtn.click()
      await expect(page.getByText('Review Background Check')).toBeVisible()
      // Fill the review form
      await page.getByPlaceholder('Summarize the findings...').fill('Automated UAT review — passed')
      await page.getByRole('button', { name: 'Complete Review' }).click()
      // Wait for modal to close
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 20_000 })
    }

    // Cleanup: delete via API
    const del = await api.delete(`/api/background-checks/${createdId}`)
    expect(del.ok()).toBeTruthy()
    await api.dispose()
  })

  test('Settings: change a user role and revert', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByText('Settings')).toBeVisible()

    // Click Users & Roles tab
    await page.getByRole('button', { name: 'Users & Roles' }).click()
    // Wait for users list
    await page.waitForTimeout(800)
    const userRow = page.locator('[data-testid="users-list"] .flex').first().catch(() => null)
    // Fallback: select first user card row
    const firstUser = userRow ?? page.locator('.card .flex').filter({ has: page.getByText('@') }).first()
    const nameEl = firstUser.locator('p').first()
    const name = await nameEl.textContent()
    test.skip(!name, 'No users available')

    // Click the role label to edit
    const roleLabel = firstUser.getByText(/Super Admin|HR Admin|Manager|Employee/i).first()
    await roleLabel.click()
    // Choose a different role from the select
    const select = firstUser.locator('select').first()
    const current = await select.inputValue()
    const options = await select.locator('option').allTextContents()
    const newOption = options.find(o => o.toLowerCase() !== current)
    if (newOption) {
      await select.selectOption({ label: newOption })
      await firstUser.getByRole('button', { name: 'Save' }).click()
      // Assert the role label changed
      await expect(firstUser.getByText(newOption)).toBeVisible({ timeout: 10_000 })
      // Revert to original
      await firstUser.getByText(newOption).click()
      await select.selectOption({ value: current })
      await firstUser.getByRole('button', { name: 'Save' }).click()
      await expect(firstUser.getByText(new RegExp(current, 'i'))).toBeVisible({ timeout: 10_000 })
    }
  })
})
