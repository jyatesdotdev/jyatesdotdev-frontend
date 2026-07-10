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

  test('tab-completes a command', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const input = page.getByLabel('Terminal input');
    await input.fill('who');
    await input.press('Tab');
    await expect(input).toHaveValue('whoami ');
  });

  test('echo redirection stores unquoted text', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const input = page.getByLabel('Terminal input');
    await input.fill('echo "hi there" > note.txt');
    await input.press('Enter');
    await input.fill('cat note.txt');
    await input.press('Enter');

    // The command echo shows the quotes as typed, but the stored file content
    // must be unquoted — assert on the cat output line, which is exactly "hi there".
    const dialog = page.getByRole('dialog', { name: /jsh/ });
    await expect(dialog.getByText('hi there', { exact: true })).toBeVisible();
  });

  test('terminal supports cwd, pipelines, and the on-call lab', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    const input = page.getByLabel('Terminal input');
    for (const command of [
      'mkdir docs',
      'cd docs',
      'echo hello world > note.txt',
      'cat note.txt | grep hello | wc -w',
    ]) {
      await input.fill(command);
      await input.press('Enter');
    }
    await expect(dialog).toContainText('guest@jyates.dev:~/docs$');
    await expect(dialog.getByText('2', { exact: true })).toBeVisible();

    await input.fill('oncall start');
    await input.press('Enter');
    await input.fill('cat ~/incident/deploys.log | grep RETRY_MAX');
    await input.press('Enter');
    await expect(dialog).toContainText('RETRY_MAX_ATTEMPTS: 3 -> 12');
    await input.fill('oncall resolve retry-storm');
    await input.press('Enter');
    await expect(dialog).toContainText('INC-2026-0710 RESOLVED');
    await expect(dialog).toContainText('Incident score: 100/100');
  });

  test('status reports live service data', async ({ page }) => {
    await page.route('**/api/v1/geo', (route) =>
      route.fulfill({
        json: { country: 'US', countryName: 'United States', city: 'Seattle' },
      })
    );
    await page.route('**/api/v1/visits', (route) =>
      route.fulfill({
        json: {
          total: 42,
          countries: [{ country: 'US', countryName: 'United States', count: 42 }],
        },
      })
    );
    await page.goto('/projects');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    const input = page.getByLabel('Terminal input');
    await input.fill('status');
    await input.press('Enter');
    await expect(dialog).toContainText('api:      operational');
    await expect(dialog).toContainText('Seattle, United States');
    await expect(dialog).toContainText('42 visits from 1 country');
    await expect(dialog).toContainText('route:    /projects');
  });

  test('terminal stays usable on a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'tools' }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();

    const dialog = page.getByRole('dialog', { name: /jsh/ });
    const input = page.getByLabel('Terminal input');
    await expect(dialog).toBeVisible();
    await expect(input).toBeVisible();
    await input.fill('man grep');
    await input.press('Enter');
    await expect(dialog).toContainText('SYNOPSIS');
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(await dialog.getByTestId('terminal').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
});
