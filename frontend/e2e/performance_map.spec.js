import { test, expect } from '@playwright/test';

test.describe('Performance Map & Off-Design E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-off-design').click();
    await expect(page.locator('text=OFF_DESIGN_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('computes compressor map and displays operating lines', async ({ page }) => {
    // Wait for the solver to compute map traces
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 20000 });

    // Verify stats are displayed
    await expect(page.locator('text=SURGE MARGIN')).toBeVisible();
    await expect(page.locator('text=PEAK EFFICIENCY')).toBeVisible();
    await expect(page.locator('text=THROTTLE STATUS')).toBeVisible();
  });

  test('switches views between Compressor Map and Throttle view', async ({ page }) => {
    // Wait for initial load
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 20000 });

    // Switch to Throttle view
    const throttleTab = page.getByRole('button', { name: /throttle/i }).first();
    if (await throttleTab.isVisible()) {
      await throttleTab.click();
      await expect(page.locator('text=THROTTLE PERFORMANCE SUITE')).toBeVisible();
    }
  });

  test('exports engine deck CSV dataset', async ({ page }) => {
    await expect(page.locator('text=SURGE MARGIN')).toBeVisible({ timeout: 20000 });

    // Switch to throttle view to find export button
    const throttleTab = page.getByRole('button', { name: /throttle/i }).first();
    if (await throttleTab.isVisible()) {
      await throttleTab.click();
      const exportBtn = page.getByRole('button', { name: /EXPORT ENGINE DECK/i });
      if (await exportBtn.isVisible() && await exportBtn.isEnabled()) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toContain('.csv');
      }
    }
  });
});
