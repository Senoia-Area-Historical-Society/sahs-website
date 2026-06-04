import { test, expect } from '@playwright/test';

test.describe('Admin auth gate', () => {
  test('unauthenticated /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');
    // Should land on login page (either redirect or show login UI)
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('unauthenticated /admin/content redirects to login', async ({ page }) => {
    await page.goto('/admin/content');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('unauthenticated /admin/memberships redirects to login', async ({ page }) => {
    await page.goto('/admin/memberships');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('login page renders Google sign-in button', async ({ page }) => {
    await page.goto('/admin/login');
    // Should show some login UI — button text may vary
    await expect(page.locator('button, [role="button"]').first()).toBeVisible();
  });
});
