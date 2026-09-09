import { test, expect } from '@playwright/test'

test('Breguet button uses SI inputs and displays actual response fields', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-mission').click()
  const request = page.waitForRequest('**/analyze/mission/breguet')
  await page.getByRole('button', { name: 'Calculate Breguet Range' }).click()
  const payload = (await request).postDataJSON()
  expect(payload.tsfc_kg_per_n_s).toBe(.000015)
  expect(payload.w_initial).toBeCloseTo(75000 * 9.80665)
  await expect(page.getByRole('status', { name: 'Breguet result' })).toContainText('Flight duration: 15.43 hours')
  await expect(page.getByRole('status', { name: 'Breguet result' })).not.toContainText('NaN')
  await page.screenshot({ path: testInfo.outputPath('breguet-result.png'), fullPage: true })
})

test('failed mission rows remain chart gaps without a design optimum', async ({ page }) => {
  await page.route('**/analyze/mission', route => route.fulfill({ json: {
    ws:[1000,2000], series:[{label:'Invalid',values:[null,null]}], optimum:null,
    feasible_boundary:[null,null], status:'INFEASIBLE',
    assurance:{status:'INFEASIBLE',warnings:['No feasible constraint points.']}
  } }))
  await page.goto('/')
  await page.locator('#nav-mission').click()
  await expect(page.getByText('INFEASIBLE', { exact: true })).toBeVisible()
  const chart = page.locator('.js-plotly-plot').first()
  await expect(chart).toBeVisible()
  expect(await chart.evaluate(el => el.data.find(trace => trace.name === 'INVALID').y)).toEqual([null,null])
  await expect(page.getByText('[COMPLIANCE: 0%]',{exact:true})).toBeVisible()
})

test('invalid diagnostics clear old metrics and never issue a fault verdict', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-diagnostics').click()
  await expect(page.getByRole('button',{name:'Export result and assurance'})).toBeVisible()
  await page.route('**/analyze/diagnostics', route => route.fulfill({status:422,json:{
    status:'INFEASIBLE', error_code:'physical_infeasibility', message:'Compressor pressure and temperature must rise.'
  }}))
  await page.locator('input[type="range"]').first().fill('150000')
  await expect(page.getByText('Compressor pressure and temperature must rise.',{exact:true})).toBeVisible()
  await expect(page.getByRole('button',{name:'Export result and assurance'})).toHaveCount(0)
  await expect(page.getByText('UNAVAILABLE',{exact:true})).toHaveCount(3)
  await page.screenshot({ path: testInfo.outputPath('diagnostic-rejection.png'), fullPage: true })
})
