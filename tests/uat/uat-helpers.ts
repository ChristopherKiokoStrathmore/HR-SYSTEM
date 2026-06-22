import { expect, type Page } from '@playwright/test'

export const CAREERS_URL = process.env.CAREERS_BASE_URL ?? process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
export const DASHBOARD_URL = process.env.DASHBOARD_BASE_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_URL ?? 'http://localhost:3000'
export const PWA_URL = process.env.PWA_BASE_URL ?? process.env.NEXT_PUBLIC_PWA_URL ?? 'http://localhost:3001'

export function appUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl).toString()
}

export async function signIn(page: Page, loginUrl: string, email: string, password: string) {
  const baseUrl = new URL(loginUrl).origin
  const res = await page.request.post(`${baseUrl}/api/auth/login`, {
    data: { email, password },
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok()) {
    throw new Error(`signIn API call failed (${res.status()}): ${await res.text()}`)
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'load' })
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}
