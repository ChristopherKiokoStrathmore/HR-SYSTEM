import { test, expect } from '@playwright/test'

test.describe('Recruitment', () => {
  test('recruitment page loads', async ({ page }) => {
    await page.goto('/recruitment')
    await expect(page.getByText('Recruitment').first()).toBeVisible({ timeout: 15_000 })
  })

  test('create a new job posting', async ({ page }) => {
    await page.goto('/recruitment')

    // Button text is "New Posting" (with Plus icon)
    const newPostingBtn = page.getByRole('button', { name: 'New Posting' })
    await expect(newPostingBtn).toBeVisible({ timeout: 15_000 })
    await newPostingBtn.click()

    // Modal opens with title "New Job Posting"
    await expect(page.getByText('New Job Posting')).toBeVisible()

    // Labels have no `for` attr — use placeholders
    await page.getByPlaceholder('Senior Software Engineer').fill('UAT Software Engineer')
    await page.getByPlaceholder('Engineering').fill('Engineering')
    // Description textarea (no placeholder — target by tag within the modal form)
    await page.locator('form textarea').first().fill(
      'This is a UAT test job posting with enough characters to pass validation minimum.'
    )

    await page.getByRole('button', { name: 'Create Posting' }).click()

    // Wait for modal to close (occurs on both success and error in the component)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 20_000 })
  })
})
