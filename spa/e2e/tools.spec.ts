import { test, expect } from '@playwright/test';

test.describe('Tools', () => {
  test('opens the terminal from the tools menu and runs a command', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    await expect(dialog).toBeVisible();

    await page.getByLabel('Terminal input').fill('whoami');
    await page.keyboard.press('Enter');
    await expect(dialog).toContainText('guest');
  });

  test('terminal window is draggable and survives navigation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    const before = await dialog.boundingBox();

    // Drag the title bar 100px right and 50px down
    const titleBar = dialog.locator('div').first();
    const barBox = await titleBar.boundingBox();
    await page.mouse.move(barBox!.x + barBox!.width / 2, barBox!.y + barBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(barBox!.x + barBox!.width / 2 + 100, barBox!.y + barBox!.height / 2 + 50);
    await page.mouse.up();

    const after = await dialog.boundingBox();
    expect(Math.round(after!.x - before!.x)).toBe(100);
    expect(Math.round(after!.y - before!.y)).toBe(50);

    // Navigating via the terminal keeps the window open
    await page.getByLabel('Terminal input').fill('open blog');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/blog/);
    await expect(dialog).toBeVisible();

    await page.getByRole('button', { name: 'Close window' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('whereami reflects the edge-resolved location', async ({ page }) => {
    await page.route('**/api/v1/geo', (route) =>
      route.fulfill({
        json: { country: 'US', countryName: 'United States', city: 'Seattle', timeZone: 'America/Los_Angeles' },
      })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    await page.getByLabel('Terminal input').fill('whereami');
    await page.keyboard.press('Enter');

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    await expect(dialog).toContainText('Seattle, United States');
  });

  test('visitor map renders the world map and country counts', async ({ page }) => {
    await page.route('**/api/v1/visits', (route) =>
      route.fulfill({
        json: {
          total: 42,
          you: 'US',
          countries: [
            { country: 'US', countryName: 'United States', count: 30 },
            { country: 'DE', countryName: 'Germany', count: 12 },
          ],
        },
      })
    );
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'visitor map' }).click();

    const dialog = page.getByRole('dialog', { name: /visitors around the world/ });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('42 hits from 2 countries');
    await expect(dialog.getByRole('img', { name: /world map/i })).toBeVisible();
    await expect(dialog).toContainText('United States');
  });
});
