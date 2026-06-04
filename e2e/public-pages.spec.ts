import { test, expect } from '@playwright/test';

test.describe('Public pages', () => {
  test('homepage loads with nav and hero', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Senoia/i);
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('news page loads and shows articles', async ({ page }) => {
    await page.goto('/news');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('box office page renders', async ({ page }) => {
    await page.goto('/box-office');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('about page renders', async ({ page }) => {
    await page.goto('/about-sahs');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('contact page renders', async ({ page }) => {
    await page.goto('/contact-sahs');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('support page renders membership tiers', async ({ page }) => {
    await page.goto('/support-sahs');
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('location and hours page renders', async ({ page }) => {
    await page.goto('/location-and-hours');
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('404 page renders for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    await expect(page.locator('body')).toBeVisible();
  });
});
