import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('cycle displays non-convergence instead of a normal result', async ({ page }, testInfo) => {
  await page.route('**/analyze/cycle', route => route.fulfill({
    status: 409, json: { status: 'NO_CONVERGENCE', error_code: 'no_convergence',
      message: 'Spool work matching reached the iteration limit.', request_id: 'browser-test',
      detail: { convergence: { termination_reason: 'iteration_limit', iterations: 1 } } },
  }))
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await expect(page.getByText(/NO_CONVERGENCE: Spool work matching/)).toBeVisible()
  await expect(page.getByText(/iteration_limit; 1 iterations/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Export result and assurance' })).toHaveCount(0)
  await page.screenshot({ path: testInfo.outputPath('cycle-no-convergence.png'), fullPage: true })
})

test('cycle sweep preserves failed points and exports null metrics', async ({ page }, testInfo) => {
  const rows = [
    { sweep_value: 300, status: 'INFEASIBLE', error: true, error_detail: 'Combustor must add heat.', spec_thrust: null, tsfc: null, eta_thermal: null },
    { sweep_value: 1700, status: 'OUTSIDE_VALIDATED_DOMAIN', error: false, spec_thrust: 800, tsfc: 0.00002, eta_thermal: .3 },
  ]
  await page.route('**/analyze/cycle/sensitivity', route => route.fulfill({ json: { sweep_label: 'TIT [K]', data: rows } }))
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-sensitivity').click()
  await expect(page.getByText('2 requested points; 1 failed points. Validation coverage is unknown.')).toBeVisible()
  const chart = page.locator('.js-plotly-plot').first()
  await expect(chart).toBeVisible()
  const values = await chart.evaluate(element => element.data.map(trace => trace.y))
  expect(values.every(series => series[0] === null)).toBeTruthy()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export all point outcomes' }).click()
  const download = await pending
  const path = testInfo.outputPath('sweep.json')
  await download.saveAs(path)
  const exported = JSON.parse(await readFile(path, 'utf8'))
  expect(exported.map(({ export_metadata, ...row }) => {
    expect(export_metadata.schema_version).toBe(1)
    return row
  })).toEqual(rows)
})

test('off-design uses normalized flow and keeps failed throttle values unavailable', async ({ page }, testInfo) => {
  await page.route('**/analyze/offdesign/throttle', route => route.fulfill({ json: [
    { throttle_pct: 55, pr: 10, mdot_corr_norm: .7, status: 'INFEASIBLE', error: true, spec_thrust: null, tsfc: null },
    { throttle_pct: 100, pr: 20, mdot_corr_norm: 1, status: 'OUTSIDE_VALIDATED_DOMAIN', error: false, spec_thrust: 900, tsfc: .00003, surge_margin_pct: 30 },
  ] }))
  await page.goto('/')
  await page.locator('#nav-off-design').click()
  await expect(page.getByText('Normalized Corrected Flow [-]', { exact: true })).toBeVisible()
  await expect(page.getByText('2 requested points; 1 failed points. Validation coverage is unknown.')).toBeVisible()
  await page.getByRole('button', { name: /^throttle$/i }).click()
  await expect(page.getByRole('cell', { name: 'INFEASIBLE', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '30.000', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('offdesign-failure.png'), fullPage: true })
})

test('rocket exposes independent ambient pressure and exports assurance', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-rocket').click()
  await page.getByRole('spinbutton', { name: 'Ambient pressure Pa' }).fill('0')
  await expect(page.getByRole('button', { name: 'Export result and assurance' })).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Exit design pressure Pe' })).toHaveValue('101325')
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export result and assurance' }).click()
  const download = await pending
  const path = testInfo.outputPath('rocket-result.json')
  await download.saveAs(path)
  const result = JSON.parse(await readFile(path, 'utf8'))
  expect(result.pa).toBe(0)
  expect(result.pe).toBe(101325)
  expect(result.assurance.applicability.within_validated_domain).toBeNull()
  await page.screenshot({ path: testInfo.outputPath('rocket-assurance.png'), fullPage: true })
})
