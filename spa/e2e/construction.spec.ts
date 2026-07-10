import { expect, test } from '@playwright/test';

test.describe('Construction sections', () => {
  test('opens each planned section in the shared floating window', async ({ page }) => {
    await page.goto('/');

    for (const section of ['games', 'lab', 'research']) {
      await page.getByRole('button', { name: section, exact: true }).click();
      await page.getByRole('menuitem', { name: 'under construction' }).click();

      const dialog = page.getByRole('dialog', { name: `${section} / under construction` });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole('img', { name: /construction worker swinging a hammer/i })).toBeVisible();
      await expect(dialog).toContainText(`${section.toUpperCase()}.EXE / STATUS 503`);

      const box = await dialog.boundingBox();
      expect(box!.width).toBeGreaterThan(700);

      const animationName = await dialog
        .getByTestId('construction-hammer')
        .evaluate((element) => getComputedStyle(element).animationName);
      expect(animationName).toContain('construction-swing');

      await dialog.getByRole('button', { name: 'Close window' }).click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test('keeps the research placeholder within a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    await page.getByRole('button', { name: 'research', exact: true }).click();
    await page.getByRole('menuitem', { name: 'under construction' }).click();

    const dialog = page.getByRole('dialog', { name: 'research / under construction' });
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);
    expect(
      await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)
    ).toBe(true);
  });
});
