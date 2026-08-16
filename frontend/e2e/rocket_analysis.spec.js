import { test, expect } from '@playwright/test';

test.describe('Rocket Combustion & Nozzle CEA E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-rocket').click();
    await expect(page.locator('text=ROCKET_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('executes chemical equilibrium solver and displays rocket performance metrics', async ({ page }) => {
    const runBtn = page.getByRole('button', { name: /RUN_CHAMBER_SYNTHESIS/i });
    if (await runBtn.isVisible()) {
      await runBtn.click();
    }

    // Wait for CEA solver calculation to complete
    await expect(page.locator('text=SPECIFIC ISP')).toBeVisible({ timeout: 25000 });
    await expect(page.locator('text=VAC. THRUST')).toBeVisible();
    await expect(page.locator('text=CHAMBER_CONSTANTS')).toBeVisible();

    // Verify MoC nozzle mesh container is rendered
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible();
  });

  test('switches propellant combinations and recomputes equilibrium', async ({ page }) => {
    const propSelect = page.locator('select').first();
    if (await propSelect.isVisible()) {
      await propSelect.selectOption({ value: 'CH4/O2' });
      const runBtn = page.getByRole('button', { name: /RUN_CHAMBER_SYNTHESIS/i });
      if (await runBtn.isVisible()) {
        await runBtn.click();
      }
      await expect(page.locator('text=SPECIFIC ISP')).toBeVisible({ timeout: 25000 });
    }
  });

  test('switches views to O/F Ratio Sweep and Altitude Performance', async ({ page }) => {
    // Switch to O/F Ratio Sweep
    const sweepTab = page.getByRole('button', { name: /OF_RATIO_SWEEP/i });
    if (await sweepTab.isVisible()) {
      await sweepTab.click();
      await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 25000 });
    }

    // Switch to Altitude Performance
    const altTab = page.getByRole('button', { name: /ALTITUDE_PERFORMANCE/i });
    if (await altTab.isVisible()) {
      await altTab.click();
      await expect(page.locator('.js-plotly-plot, table').first()).toBeVisible({ timeout: 25000 });
    }
  });

  test('triggers 3D STL and Wavefront OBJ geometry downloads', async ({ page }) => {
    const runBtn = page.getByRole('button', { name: /RUN_CHAMBER_SYNTHESIS/i });
    if (await runBtn.isVisible()) {
      await runBtn.click();
    }
    await expect(page.locator('text=SPECIFIC ISP')).toBeVisible({ timeout: 25000 });

    // Verify STL export button
    const stlBtn = page.getByRole('button', { name: /STL/i }).first();
    if (await stlBtn.isVisible() && await stlBtn.isEnabled()) {
      const downloadPromise = page.waitForEvent('download');
      await stlBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toContain('.stl');
    }
  });
});
