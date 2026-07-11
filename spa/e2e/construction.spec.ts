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

  test('brings whichever floating window is selected to the foreground', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'tools', exact: true }).click();
    await page.getByRole('menuitem', { name: 'terminal' }).click();
    const terminal = page.getByRole('dialog', { name: /jsh/ });

    await page.getByRole('button', { name: 'games', exact: true }).click();
    await page.getByRole('menuitem', { name: 'under construction' }).click();
    const construction = page.getByRole('dialog', { name: 'games / under construction' });

    const terminalBox = await terminal.boundingBox();
    const constructionBox = await construction.boundingBox();
    expect(constructionBox!.y - terminalBox!.y).toBeGreaterThanOrEqual(30);
    expect(await construction.evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(
      await terminal.evaluate((element) => Number(getComputedStyle(element).zIndex))
    );

    const terminalTitleBar = terminal.locator(':scope > div').first();
    await terminalTitleBar.click({ position: { x: terminalBox!.width / 2, y: 10 } });
    expect(await terminal.evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(
      await construction.evaluate((element) => Number(getComputedStyle(element).zIndex))
    );

    await page.mouse.click(
      constructionBox!.x + constructionBox!.width / 2,
      constructionBox!.y + constructionBox!.height - 10
    );
    expect(await construction.evaluate((element) => Number(getComputedStyle(element).zIndex))).toBeGreaterThan(
      await terminal.evaluate((element) => Number(getComputedStyle(element).zIndex))
    );

    await page.keyboard.press('Escape');
    await expect(construction).not.toBeVisible();
    await expect(terminal).toBeVisible();
  });

  test('keeps multiple windows from the same menu open independently', async ({ page }) => {
    await page.goto('/');

    for (let count = 0; count < 2; count++) {
      await page.getByRole('button', { name: 'tools', exact: true }).click();
      await page.getByRole('menuitem', { name: 'terminal' }).click();
    }

    const terminals = page.getByRole('dialog', { name: /jsh/ });
    await expect(terminals).toHaveCount(2);
    await expect(terminals.nth(0)).toBeVisible();
    await expect(terminals.nth(1)).toBeVisible();

    await terminals.nth(1).getByRole('button', { name: 'Close window' }).click();
    await expect(terminals).toHaveCount(1);
    await expect(terminals.nth(0)).toBeVisible();
  });
});
