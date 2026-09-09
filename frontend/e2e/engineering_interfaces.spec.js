import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function exported(page) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: /export.*json|export.*scenario/i }).click()
  return JSON.parse(await readFile(await (await pending).path(), 'utf8'))
}
async function upload(page, data) {
  await page.locator('input[type=file]').setInputFiles({ name: 'scenario.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) })
}
for (const [nav, model, group, field, value] of [
  ['on-design', 'legacy_cycle', 'params', 'mach', .7],
  ['rocket', 'rocket', 'params', 'pc', 9000000],
  ['off-design', 'generic_map', 'params', 'prc', 18],
  ['mission', 'mission_constraints', 'aircraftData', 'k', .08],
]) {
  test(`${model} versioned roundtrip, legacy migration, and rejected foreign file`, async ({ page }) => {
    await page.goto('/')
    await page.locator(`#nav-${nav}`).click()
    const file = await exported(page)
    expect(file.schema_version).toBe(1)
    expect(file.units).toBe('SI')
    expect(file.model).toBe(model)
    file.inputs[group][field] = value
    await upload(page, file)
    await expect(page.getByLabel('Scenario source')).toContainText('scenario.json')
    expect((await exported(page)).inputs[group][field]).toBe(value)
    await upload(page, { [group]: { [field]: value } })
    expect((await exported(page)).inputs[group][field]).toBe(value)
    await upload(page, { ...file, model: 'wrong_page' })
    await expect(page.getByRole('alert').filter({ hasText: 'Scenario import/export' })).toBeVisible()
    expect((await exported(page)).inputs[group][field]).toBe(value)
  })
}
for (const [nav, name, group, field, value] of [
  ['on-design', 'CFM56-7B', 'params', 'prc', 32.8],
  ['rocket', 'SpaceX Merlin 1D', 'params', 'pc', 9700000],
  ['mission', 'F-16C Fighting Falcon', 'aircraftData', 'k', .09],
]) {
  test(`${nav} preset applies compatible values with source limitations`, async ({ page }, testInfo) => {
    await page.goto('/')
    await page.locator(`#nav-${nav}`).click()
    await page.getByRole('button', { name: /PRESETS/i }).click()
    await expect(page.getByRole('dialog')).toContainText('Independent sources are not recorded')
    await page.getByRole('dialog').getByRole('button').filter({ hasText: name }).click()
    await expect(page.getByLabel('Scenario source')).toContainText(name)
    await expect(page.getByLabel('Scenario source')).toContainText('Fields not applied')
    const file = await exported(page)
    expect(file.inputs[group][field]).toBe(value)
    expect(file.provenance.kind).toBe('preset')
    if (nav === 'on-design') expect(file.inputs.engine).toBe('turbofan')
    await page.getByLabel('Scenario source').scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`${nav}-provenance.png`) })
  })
}

test('result export includes versioned metadata and expandable model evidence', async ({ page }) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  const panel = page.getByLabel('Solver assurance')
  await expect(panel).toBeVisible()
  await panel.getByText('Inputs and model evidence').click()
  await expect(panel.locator('pre')).toContainText('inputs_si')
  const pending = page.waitForEvent('download')
  await panel.getByRole('button', { name: 'Export result and assurance' }).click()
  const file = JSON.parse(await readFile(await (await pending).path(), 'utf8'))
  expect(file.export_metadata.schema_version).toBe(1)
  expect(file.assurance.inputs_si).toBeTruthy()
  expect(file.assurance.validation.level).toBe('unvalidated')
})


test('preset sliders preserve low bypass ratio and high chamber pressure', async ({ page }) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.getByRole('button', { name: /PRESETS/i }).click()
  await page.getByRole('dialog').getByRole('button').filter({ hasText: 'F100-PW-229' }).click()
  await expect(page.getByRole('slider', { name: /^Bypass Ratio:/ })).toHaveValue('0.36')
  await expect(page.getByRole('slider', { name: /^Fan Pressure Ratio:/ })).toHaveValue('3.8')
  await page.locator('#nav-rocket').click()
  await page.getByRole('button', { name: /PRESETS/i }).click()
  await page.getByRole('dialog').getByRole('button').filter({ hasText: 'SpaceX Raptor 2' }).click()
  await expect(page.getByRole('slider', { name: /^Chamber Pressure:/ })).toHaveValue('30')
})

test('failed import invalidates a pending legacy calculation', async ({ page }) => {
  let release
  const hold = new Promise(resolve => { release = resolve })
  let started
  const requestStarted = new Promise(resolve => { started = resolve })
  await page.route('**/analyze/cycle', async route => {
    started()
    await hold
    await route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ detail: 'OBSOLETE_RESULT' }) })
  })
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await requestStarted
  await upload(page, { schema: 'propulsion-analysis-scenario', schema_version: 99 })
  await expect(page.getByRole('alert').filter({ hasText: 'Scenario import/export' })).toBeVisible()
  const response = page.waitForResponse('**/analyze/cycle')
  release()
  await response
  await expect(page.getByText(/OBSOLETE_RESULT/)).toHaveCount(0)
  await expect(page.getByLabel('Solver assurance')).toHaveCount(0)
})
