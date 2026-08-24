import { test, expect } from '@playwright/test';

test.describe('Member Portal (/membership-status)', () => {
  test('page renders with email input form', async ({ page }) => {
    await page.goto('/membership-status');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('shows error for unknown email', async ({ page }) => {
    await page.goto('/membership-status');
    await page.locator('input[type="email"]').fill('nobody@example.com');
    await page.locator('button[type="submit"]').click();
    // Wait for async response
    await page.waitForResponse(resp => resp.url().includes('getMembershipByEmail'), { timeout: 10000 });
    await expect(page.locator('text=/no membership|not found/i')).toBeVisible({ timeout: 5000 });
  });

  test('renew link points to /support-sahs', async ({ page }) => {
    await page.goto('/membership-status');
    // The page renders this link statically, without needing a membership lookup.
    await expect(page.locator('input[type="email"]')).toBeVisible();
    // Assert the renew link itself — the point of the test. It was previously
    // located and then never asserted on, so the test passed without ever
    // checking the behaviour its name describes.
    await expect(page.locator('a[href="/support-sahs"]').first()).toBeVisible();
  });
});
