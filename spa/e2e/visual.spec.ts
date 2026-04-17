import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Math.random to always return a deterministic value
    // This prevents flaky visual tests from the random library items
    await page.addInitScript(() => {
      Math.random = () => 0.5;
    });
  });

  test('home page looks correct', async ({ page }) => {
    await page.goto('/');
    // Wait for the fonts and images to load to avoid flaky screenshots
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('career page looks correct', async ({ page }) => {
    await page.goto('/career');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('career-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('blog index looks correct', async ({ page }) => {
    await page.goto('/blog');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('blog-index.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
