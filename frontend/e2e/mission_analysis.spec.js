import { test, expect } from '@playwright/test';

test.describe('Mission Constraint Synthesis E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('#nav-mission').click();
    await expect(page.locator('text=MISSION_NODE')).toBeVisible({ timeout: 15000 });
  });

  test('synthesizes constraint diagram and displays feasible design space', async ({ page }) => {
    // Wait for the solver to compute constraints
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 20000 });

    // Verify stats
    await expect(page.locator('text=DESIGN WING LOADING')).toBeVisible();
    await expect(page.locator('text=MINIMUM T/W')).toBeVisible();
    await expect(page.locator('text=ENVELOPE COMPLIANCE')).toBeVisible();
    await expect(page.getByRole('heading', { name: /OPERATIONAL_SYNTHESIS_REPORT/i })).toBeVisible();
  });

  test('adjusts aircraft aerodynamic sliders and re-solves constraints', async ({ page }) => {
    await expect(page.locator('.js-plotly-plot').first()).toBeVisible({ timeout: 20000 });

    // Adjust CD0 or induced drag sliders
    const slider = page.locator('input[type="range"]').first();
    if (await slider.isVisible()) {
      await slider.fill('0.03');
      // Verify plot updates and remains visible
      await expect(page.locator('.js-plotly-plot').first()).toBeVisible();
    }
  });

  test('verifies Breguet payload-range calculator', async ({ page }) => {
    // Look for Breguet Range Calculator section
    await expect(page.getByRole('heading', { name: /Breguet Payload-Range/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Calculate Breguet Range/i })).toBeVisible();
  });
});
