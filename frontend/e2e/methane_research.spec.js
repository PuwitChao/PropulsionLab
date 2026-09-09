import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('methane model solves and exports explicit evidence', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-methane_research').click()
  await expect(page.getByRole('heading', { name: 'Methane research ramjet' })).toBeVisible()
  await page.getByRole('button', { name: 'Solve methane ramjet', exact: true }).click()
  await expect(page.getByLabel('Methane result')).toBeVisible()
  await expect(page.getByText('Thermal efficiency: Unavailable · Propulsive efficiency: Unavailable')).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export result and assurance' }).click()
  const downloaded = await pending
  const path = testInfo.outputPath('methane-result.json')
  await downloaded.saveAs(path)
  const result = JSON.parse(await readFile(path, 'utf8'))
  expect(result.model).toBe('methane_ramjet_research')
  expect(result.eta_propulsive).toBeNull()
  expect(result.assurance.inputs_si.altitude_m).toBe(0)
  expect(Math.abs(result.burner.energy_residual_j_per_kg_air)).toBeLessThan(2)
  await page.getByRole('heading', { name: 'Methane research ramjet' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('methane-ui.png'), fullPage: true })
})

test('research scenario roundtrip and legacy import rejection', async ({ page }) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-methane_research').click()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export methane scenario' }).click()
  const download = await pending
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(exported.model).toBe('methane_ramjet_research')
  const file = page.getByLabel('Import methane scenario')
  await file.setInputFiles({ name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ params: { mach: .8 } })) })
  await expect(page.getByRole('alert')).toContainText('Legacy cycle files are not compatible')
  expect(exported.schema_version).toBe(1)
  expect(exported.units).toBe('SI')
  exported.inputs.mach = 2
  await file.setInputFiles({ name: 'research.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(exported)) })
  await expect(page.getByRole('spinbutton', { name: 'Flight Mach', exact: true })).toHaveValue('2')
  await page.locator('#engine-tab-turbojet').click()
  await expect(page.getByLabel('Methane research ramjet')).toHaveCount(0)
})


test('turbojet selection solves shaft work and rejects ramjet scenario', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-methane_turbojet').click()
  await expect(page.getByRole('heading', { name: 'Methane research turbojet' })).toBeVisible()
  await page.getByRole('button', { name: 'Solve methane turbojet', exact: true }).click()
  await expect(page.getByLabel('Methane result')).toBeVisible()
  await expect(page.getByText(/Shaft work residual:/)).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export result and assurance' }).click()
  const download = await pending
  const result = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(result.model).toBe('methane_turbojet_research')
  expect(Math.abs(result.shaft.residual_j_per_kg_core_air)).toBeLessThan(1)
  const scenarioPending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export methane scenario' }).click()
  const scenarioFile = await scenarioPending
  const scenario = JSON.parse(await readFile(await scenarioFile.path(), 'utf8'))
  await page.getByLabel('Import methane scenario').setInputFiles({ name: 'turbojet.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scenario)) })
  await expect(page.getByRole('spinbutton', { name: 'Compressor pressure ratio', exact: true })).toHaveValue('10')
  await page.getByRole('heading', { name: 'Methane research turbojet' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('turbojet-ui.png'), fullPage: true })
  await page.locator('#engine-tab-methane_research').click()
  await page.getByLabel('Import methane scenario').setInputFiles({ name: 'wrong-architecture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scenario)) })
  await expect(page.getByRole('alert')).toContainText('selected research architecture')
})


test('turbojet afterburner exports added fuel and imports older dry scenarios', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-methane_turbojet').click()
  await page.getByRole('checkbox', { name: 'Enable methane afterburner' }).check()
  await page.getByRole('button', { name: 'Solve methane turbojet', exact: true }).click()
  await expect(page.getByText(/Added afterburner fuel\/core-air ratio:/)).toBeVisible()
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export result and assurance' }).click()
  const download = await pending
  const result = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(result.f_afterburner).toBeGreaterThan(0)
  expect(result.f_total).toBeCloseTo(result.f_main + result.f_afterburner, 10)
  expect(result.afterburner.products.temperature_k).toBeCloseTo(2200, 3)
  const scenarioPending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export methane scenario' }).click()
  const scenarioFile = await scenarioPending
  const scenario = JSON.parse(await readFile(await scenarioFile.path(), 'utf8'))
  await page.getByLabel('Import methane scenario').setInputFiles({ name: 'wet.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(scenario)) })
  await expect(page.getByRole('checkbox', { name: 'Enable methane afterburner' })).toBeChecked()
  await page.getByRole('checkbox', { name: 'Enable methane afterburner' }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: testInfo.outputPath('afterburner-ui.png'), fullPage: true })
  const older = { ...scenario.inputs }
  for (const key of Object.keys(older)) if (key.startsWith('afterburner_')) delete older[key]
  await page.getByLabel('Import methane scenario').setInputFiles({ name: 'older-dry.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(older)) })
  await expect(page.getByRole('checkbox', { name: 'Enable methane afterburner' })).not.toBeChecked()
  await expect(page.getByRole('spinbutton', { name: 'Afterburner temperature (K)', exact: true })).toBeDisabled()
})


for (const engine of ['turbofan', 'mixed_turbofan', 'multispool']) {
  test(`${engine} research selection exports shaft and stream evidence`, async ({ page }, testInfo) => {
    await page.goto('/')
    await page.locator('#nav-on-design').click()
    await page.locator(`#engine-tab-methane_${engine}`).click()
    await page.getByRole('button', { name: `Solve methane ${engine}`, exact: true }).click()
    await expect(page.getByLabel('Methane result')).toBeVisible({ timeout: 30000 })
    await expect(page.getByText(/HP shaft work residual:/)).toBeVisible()
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export result and assurance' }).click()
    const downloaded = await pending
    const result = JSON.parse(await readFile(await downloaded.path(), 'utf8'))
    expect(result.model).toBe(`methane_${engine}_research`)
    expect(Object.keys(result.shafts)).toHaveLength(engine === 'multispool' ? 3 : 2)
    expect(Object.keys(result.nozzles)).toHaveLength(engine === 'mixed_turbofan' ? 1 : 2)
    await page.getByRole('heading', { name: `Methane research ${engine}` }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`${engine}-ui.png`), fullPage: true })
  })
}


test('unsupported scenario versions preserve current inputs and clear old evidence', async ({ page }) => {
  await page.goto('/')
  await page.locator('#nav-on-design').click()
  await page.locator('#engine-tab-methane_research').click()
  await page.getByRole('button', { name: 'Solve methane ramjet', exact: true }).click()
  await expect(page.getByLabel('Methane result')).toBeVisible()
  await page.getByLabel('Import methane scenario').setInputFiles({ name: 'future.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schema: 'propulsion-analysis-scenario', schema_version: 99 })) })
  await expect(page.getByRole('alert')).toContainText('Unsupported scenario schema or version')
  await expect(page.getByRole('spinbutton', { name: 'Flight Mach', exact: true })).toHaveValue('3')
  await expect(page.getByLabel('Methane result')).toHaveCount(0)
})
