import { test, expect } from '@playwright/test';

test.describe('Parametric Cycle Solver E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-on-design').click();
    await expect(page.locator('text=ON_DESIGN_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('solves turbojet cycle and renders thermodynamic performance metrics', async ({ page }) => {
    // Wait for the solver to compute results
    await expect(page.locator('text=SPECIFIC THRUST')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=SFC')).toBeVisible();
    await expect(page.locator('text=THERMAL EFF.')).toBeVisible();

    // Verify Thermodynamic Stations Table
    await expect(page.getByRole('heading', { name: /STATION_PROPERTY_MATRIX/i })).toBeVisible();
    await expect(page.locator('text=Freestream').first()).toBeVisible();
    await expect(page.locator('text=Combustor Exit').first()).toBeVisible();
  });

  test('switches engine architecture between Turbofan and Multi-Spool', async ({ page }) => {
    // Switch to Turbofan
    const turbofanTab = page.locator('#engine-tab-turbofan');
    await turbofanTab.click();
    await expect(page.locator('text=TURBOFAN_SPEC')).toBeVisible();
    await expect(page.locator('text=Bypass Ratio')).toBeVisible();

    // Wait for Turbofan calculation result
    await expect(page.locator('text=SPECIFIC THRUST')).toBeVisible({ timeout: 20000 });

    // Switch to Multi-Spool
    const multispoolTab = page.locator('#engine-tab-multispool_turbofan');
    await multispoolTab.click();
    await expect(page.locator('text=DUAL_SPOOL_SPEC')).toBeVisible();
    await expect(page.locator('text=LPC / Booster PR')).toBeVisible();
  });

  test('interacts with SVG blueprint and station probe modal', async ({ page }) => {
    // Wait for blueprint SVG to render
    const blueprintHeading = page.getByRole('heading', { name: /Interactive Thermodynamic Engine Blueprint/i });
    await expect(blueprintHeading).toBeVisible({ timeout: 20000 });

    // Find station nodes in SVG and click a node
    const stationNodes = page.locator('svg circle');
    if (await stationNodes.count() > 0) {
      await stationNodes.first().click();
      await expect(page.locator('text=Stagnation Temperature')).toBeVisible();
      // Close probe modal
      const closeBtn = page.locator('button:has(span:text("close"))').last();
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(page.locator('text=Stagnation Temperature')).not.toBeVisible();
      }
    }
  });

  test('sets and clears reference baseline comparison', async ({ page }) => {
    await expect(page.locator('text=SPECIFIC THRUST')).toBeVisible({ timeout: 20000 });

    // Click "SET_REFERENCE"
    const refBtn = page.getByRole('button', { name: /SET_REFERENCE/i });
    if (await refBtn.isVisible()) {
      await refBtn.click();
      await expect(page.getByRole('button', { name: /CLEAR_REFERENCE/i })).toBeVisible();

      // Clear reference
      await page.getByRole('button', { name: /CLEAR_REFERENCE/i }).click();
      await expect(page.getByRole('button', { name: /SET_REFERENCE/i })).toBeVisible();
    }
  });

  test('executes sensitivity sweep and renders sensitivity analysis', async ({ page }) => {
    const sensTab = page.locator('#engine-tab-sensitivity');
    await sensTab.click();
    await expect(page.locator('text=SWEEP PARAMETER')).toBeVisible();

    // Verify sensitivity chart container
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 25000 });
  });
});
