import { test, expect } from '@playwright/test'

async function login(page: any, email: string, password: string) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
}

test('health endpoint is up', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  expect((await res.json()).db).toBe('up')
})

test('OWNER loguje się i trafia do centrum dowodzenia', async ({ page }) => {
  await login(page, 'owner@workos.pl', 'owner123')
  await page.waitForURL('**/owner', { timeout: 15000 })
  await expect(page.getByText('Centrum dowodzenia')).toBeVisible()
})

test('EMPLOYEE nie ma dostępu do /owner (redirect)', async ({ page }) => {
  await login(page, 'anna@workos.pl', 'anna123')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  await page.goto('/owner')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  expect(page.url()).toContain('/dashboard')
})
