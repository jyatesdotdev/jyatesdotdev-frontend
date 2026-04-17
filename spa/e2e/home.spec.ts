import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should have correct title and metadata', async ({ page }) => {
    await page.goto('/');
    
    // Validate title (hydrated by React Helmet)
    await expect(page).toHaveTitle(/Jonathan Yates/);
    
    // Validate key content
    await expect(page.locator('h1').first()).toContainText('Jonathan Yates');
    await expect(page.locator('h2').first()).toContainText('Senior Software Developer');
  });

  test('should navigate to the career page', async ({ page }) => {
    await page.goto('/');
    
    // Find the link to the Career page in Quick Links
    await page.click('text=View Career Timeline');
    
    // Verify navigation
    await expect(page).toHaveURL(/.*\/career/);
    await expect(page.locator('h1')).toContainText('Career Timeline');
  });

  test('should navigate to the blog page', async ({ page }) => {
    await page.goto('/');
    
    // Wait for hydration and click link
    await page.click('text=View all posts →');
    
    await expect(page).toHaveURL(/.*\/blog/);
    await expect(page.locator('h1')).toContainText('Blog');
  });
});
