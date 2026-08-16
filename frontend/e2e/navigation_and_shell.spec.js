import { test, expect } from '@playwright/test';

test.describe('App Shell & Navigation E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
  });

  test('loads mainframe dashboard with healthy backend status and metadata', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'PROPULSION_LAB' })).toBeVisible();

    // Verify backend status indicator shows STABLE
    await expect(page.locator('text=STABLE').first()).toBeVisible({ timeout: 15000 });

    // Verify nav items are present
    await expect(page.locator('#nav-on-design')).toBeVisible();
    await expect(page.locator('#nav-off-design')).toBeVisible();
    await expect(page.locator('#nav-rocket')).toBeVisible();
    await expect(page.locator('#nav-mission')).toBeVisible();
    await expect(page.locator('#nav-diagnostics')).toBeVisible();
    await expect(page.locator('#nav-settings')).toBeVisible();
  });

  test('navigates seamlessly across all domain modules', async ({ page }) => {
    // 1. Navigate to Cycle Solver
    await page.locator('#nav-on-design').click();
    await expect(page.locator('text=ON_DESIGN_NODE')).toBeVisible({ timeout: 15000 });

    // 2. Navigate to Map Matching
    await page.locator('#nav-off-design').click();
    await expect(page.locator('text=OFF_DESIGN_NODE')).toBeVisible({ timeout: 15000 });

    // 3. Navigate to Chamber CEA
    await page.locator('#nav-rocket').click();
    await expect(page.locator('text=ROCKET_NODE')).toBeVisible({ timeout: 15000 });

    // 4. Navigate to Size Synth (Mission Analysis)
    await page.locator('#nav-mission').click();
    await expect(page.locator('text=MISSION_NODE')).toBeVisible({ timeout: 15000 });

    // 5. Navigate to Fault Isolation (Diagnostics)
    await page.locator('#nav-diagnostics').click();
    await expect(page.locator('text=DIAGNOSTICS_NODE')).toBeVisible({ timeout: 15000 });

    // 6. Navigate to Environment (Settings)
    await page.locator('#nav-settings').click();
    await expect(page.locator('text=SETTINGS_NODE')).toBeVisible({ timeout: 15000 });

    // 7. Return to Mainframe
    await page.locator('#nav-dashboard').click();
    await expect(page.locator('text=MAIN_TERMINAL')).toBeVisible({ timeout: 15000 });
  });

  test('toggles unit systems between SI and Imperial via button and keyboard shortcut', async ({ page }) => {
    const unitBtn = page.getByRole('button', { name: /SI \(METRIC\)|IMPERIAL/i });
    await expect(unitBtn).toBeVisible();
    await expect(unitBtn).toContainText('SI');

    // Click unit toggle button
    await unitBtn.click();
    await expect(unitBtn).toContainText('IMPERIAL');

    // Press keyboard shortcut 'U' to toggle back
    await page.keyboard.press('u');
    await expect(unitBtn).toContainText('SI');
  });

  test('opens and closes presets modal via UI trigger and keyboard shortcut', async ({ page }) => {
    const presetBtn = page.getByRole('button', { name: /PRESETS/i });
    if (await presetBtn.isVisible()) {
      await presetBtn.click();
      await expect(page.getByRole('heading', { name: /SELECT PROPULSION PRESET PROFILE/i })).toBeVisible();

      // Close with Close button
      await page.getByRole('button', { name: /Close preset selector/i }).click();
      await expect(page.getByRole('heading', { name: /SELECT PROPULSION PRESET PROFILE/i })).not.toBeVisible();
    }

    // Open via keyboard shortcut 'P'
    await page.keyboard.press('p');
    await expect(page.getByRole('heading', { name: /SELECT PROPULSION PRESET PROFILE/i })).toBeVisible();

    await page.keyboard.press('Escape');
  });

  test('opens and closes keyboard shortcuts modal via ? shortcut', async ({ page }) => {
    await page.keyboard.press('?');
    await expect(page.getByRole('heading', { name: /KEYBOARD SHORTCUTS & CONTROLS/i })).toBeVisible();

    await page.getByRole('button', { name: /Close keyboard shortcuts modal/i }).click();
    await expect(page.getByRole('heading', { name: /KEYBOARD SHORTCUTS & CONTROLS/i })).not.toBeVisible();
  });
});
