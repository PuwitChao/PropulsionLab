import { test, expect } from '@playwright/test'

test('engineering runtime excludes maps and retains 2D and 3D plots', async ({ page }) => {
  await page.goto('/')
  const evidence = await page.evaluate(async () => {
    const { default: Plotly } = await import('/src/utils/chartRuntime.js')
    const traces = Object.keys(Plotly.PlotSchema.get().traces)
    const target = document.createElement('div')
    document.body.appendChild(target)
    await Plotly.newPlot(target, [{ type: 'scatter', x: [0, 1], y: [0, 1] }])
    const scatter = target._fullData[0].type
    await Plotly.react(target, [{ type: 'mesh3d', x: [0, 1, 0], y: [0, 0, 1], z: [0, 1, 0], i: [0], j: [1], k: [2] }])
    const mesh = target._fullData[0].type
    Plotly.purge(target)
    target.remove()
    return { traces, scatter, mesh }
  })
  expect(evidence.traces).toContain('scatter')
  expect(evidence.traces).toContain('mesh3d')
  expect(evidence.traces).toContain('surface')
  for (const type of ['scattermap', 'choroplethmap', 'scattermapbox', 'choroplethmapbox']) expect(evidence.traces).not.toContain(type)
  expect(evidence.scatter).toBe('scatter')
  expect(evidence.mesh).toBe('mesh3d')
})
