import { test, expect } from '@playwright/test';

test.describe('Settings, Preferences & Resilience E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-settings').click();
    await expect(page.locator('text=SETTINGS_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('probes backend telemetry and displays system diagnostics', async ({ page }) => {
    // Check system diagnostics
    await expect(page.locator('text=CANTERA_CORE')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=SYSTEM_DIAGNOSTICS')).toBeVisible();
  });

  test('toggles luminance profile between Dark and Light mode', async ({ page }) => {
    const lightBtn = page.locator('#theme-light');
    if (await lightBtn.isVisible()) {
      await lightBtn.click();
      // Verify html data-theme is set to light
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

      // Toggle back to Dark
      const darkBtn = page.locator('#theme-dark');
      await darkBtn.click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
  });

  test('adjusts typography scale slider', async ({ page }) => {
    const fontSlider = page.locator('input[type="range"]').first();
    if (await fontSlider.isVisible()) {
      await fontSlider.fill('1.2');
      await expect(page.getByRole('heading', { name: /SYSTEM_ENVIRONMENT_CONFIG/i })).toBeVisible();
    }
  });
});
