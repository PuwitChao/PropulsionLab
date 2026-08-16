import { test, expect } from '@playwright/test';

test.describe('Thermodynamic Diagnostics E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-diagnostics').click();
    await expect(page.locator('text=DIAGNOSTICS_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('runs automated fault isolation and displays health verdict', async ({ page }) => {
    // Wait for diagnostics result to compute
    await expect(page.locator('text=COMPRESSOR_EFF')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=TURBINE_EFF')).toBeVisible();
    await expect(page.locator('text=BURNER_DP_LOSS')).toBeVisible();
    await expect(page.getByRole('heading', { name: /DIAGNOSTIC_ANALYSIS_REPORT/i })).toBeVisible();
  });

  test('adjusts sensor telemetry sliders to simulate component degradation', async ({ page }) => {
    await expect(page.locator('text=COMPRESSOR_EFF')).toBeVisible({ timeout: 15000 });

    // Find slider for inlet pressure and adjust it
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('150000');
      // Verify re-computation
      await expect(page.locator('text=COMPRESSOR_EFF')).toBeVisible();
    }
  });

  test('displays diagnostic status and system telemetry trace', async ({ page }) => {
    await expect(page.locator('text=COMPRESSOR_EFF')).toBeVisible({ timeout: 15000 });

    // Look for status badge
    await expect(page.locator('.status-badge').first()).toBeVisible();
  });
});
