// Requires @playwright/test when available in CI.
import { test, expect } from '@playwright/test';

test.describe('Governance dashboard', () => {
  test('renders accessible dashboard shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Web3 Governance Light Client' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Validator name' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh now' })).toBeVisible();
  });

  test('allows setting validator identity and chain scope', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Validator name' }).fill('Test Validator');
    await page.getByLabel('Ethereum').check();
    await expect(page.getByText('Viewing for validator: Test Validator')).toBeVisible();
  });

  test('never shows closed/passed status badge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('closed')).toHaveCount(0);
  });
});
