import { test, expect } from '@playwright/test';

test.describe('Temples', () => {
  test('temples page loads with temple cards', async ({ page }) => {
    await page.goto('/temples');
    await expect(page.locator('h1')).toContainText('Temples');
    // Should have temple cards with images
    const cards = page.locator('a[href^="/temples/"]');
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('temples have images, not just placeholders', async ({ page }) => {
    await page.goto('/temples');
    const images = page.locator('a[href^="/temples/"] img');
    const count = await images.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('temple filters are present', async ({ page }) => {
    await page.goto('/temples');
    await expect(page.locator('select').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('clicking a temple navigates to detail page', async ({ page }) => {
    await page.goto('/temples');
    const firstCard = page.locator('a[href^="/temples/"]').first();
    await firstCard.click();
    await page.waitForURL(/\/temples\/.+/);
    // Detail page should have temple info
    await expect(page.locator('h1')).toBeVisible();
  });

  test('temple detail has gallery, pujas, and sidebar', async ({ page }) => {
    await page.goto('/temples/kashi-vishwanath');
    await expect(page.locator('h1')).toContainText('Kashi Vishwanath');
    // Gallery images
    const galleryImages = page.locator('section img');
    expect(await galleryImages.count()).toBeGreaterThanOrEqual(3);
    // Pujas section
    await expect(page.locator('text=Available Pujas').first()).toBeVisible();
    // Book Now button
    await expect(page.locator('text=Book Now').first()).toBeVisible();
  });
});
