import { test, expect } from '@playwright/test'

test('redirects unauthenticated user to signin', async ({ page }) => {
  await page.goto('/')
  // App should land on signin for unauthenticated users.
  await expect(page).toHaveURL(/\/auth\/signin/)
})

test('signin page renders', async ({ page }) => {
  await page.goto('/auth/signin')
  await expect(page.getByRole('heading')).toBeVisible()
})

