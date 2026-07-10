import { test, expect } from '@playwright/test';

test.describe('Content subscriptions', () => {
  test('submits explicit preferences from the blog', async ({ page }) => {
    let requestBody: unknown;
    await page.route('**/api/v1/subscriptions', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 202, json: { message: 'confirmation sent' } });
    });
    await page.goto('/blog');

    const email = page.getByLabel('Email address');
    await expect(page.getByRole('checkbox', { name: 'Blog posts' })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Projects' })).not.toBeChecked();
    await page.getByRole('checkbox', { name: 'Projects' }).check();
    await email.fill('reader@example.com');
    await page.getByRole('button', { name: 'Subscribe' }).click();

    await expect(page.getByText(/Confirmation email sent/)).toBeVisible();
    expect(requestBody).toEqual({
      email: 'reader@example.com',
      topics: ['blog', 'projects'],
      website: '',
    });
  });

  test('confirms a token from the email link', async ({ page }) => {
    let requestBody: unknown;
    await page.route('**/api/v1/subscriptions/confirm', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, json: { message: 'subscription confirmed' } });
    });

    await page.goto('/subscribe/confirm?token=test-token');

    await expect(page.getByRole('heading', { name: 'Subscription confirmed' })).toBeVisible();
    expect(requestBody).toEqual({ token: 'test-token' });
  });

  test('keeps the signup controls inside a mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/projects');

    const form = page.getByRole('heading', { name: 'Get new work by email' }).locator('..');
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: 'Projects' })).toBeChecked();
    expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  });
});
