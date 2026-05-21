import { expect, type Page } from '@playwright/test'

export const CAREERS_URL = process.env.CAREERS_BASE_URL ?? process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
export const DASHBOARD_URL = process.env.DASHBOARD_BASE_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000'
export const PWA_URL = process.env.PWA_BASE_URL ?? process.env.NEXT_PUBLIC_PWA_URL ?? 'http://localhost:3001'

export function appUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

export async function signIn(page: Page, loginUrl: string, email: string, password: string) {
  await page.goto(loginUrl)
  await expect(page.locator('#email')).toBeVisible({ timeout: 20_000 })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}
