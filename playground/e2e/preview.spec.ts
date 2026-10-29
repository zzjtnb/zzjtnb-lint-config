import { expect, test } from '@playwright/test'
import { attachMetrics, chooseOption } from './helpers'

test('仅准备当前文件类型，其他示例按需首次检查与修复', async ({ page }) => {
  test.setTimeout(600000)
  const started = Date.now()
  await page.goto('/#/eslint/experiment')
  const select = page.getByRole('combobox', { name: '编辑文件', exact: true })
  await expect(select).toBeVisible()
  await expect(page.locator('.runtime-state')).toContainText(/浏览器引擎已就绪|引擎准备失败/, { timeout: 420000 })
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
  await attachMetrics('PREVIEW_PREPARATION_MS', [Date.now() - started])
  await attachMetrics('PREVIEW_STARTUP_MS', [await page.evaluate(() => performance.getEntriesByName('playground:eslint:startup').at(-1)?.duration)])
  const measurements = []
  for (const file of [
    'module.ts',
    'module.js',
    'component.vue',
    'module.json',
    'settings.yaml',
    'settings.toml',
  ]) {
    await chooseOption(page, select, file)
    await expect(page.getByRole('combobox', { name: '编辑文件', exact: true })).toHaveAttribute('data-value', file)
    for (const action of ['检查代码', '预览修复']) {
      const start = Date.now()
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 30000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
      const wall = Date.now() - start
      measurements.push({
        file,
        action,
        wall,
        summary: await page.locator('.result-summary').textContent(),
      })
      expect(wall).toBeLessThan(5000)
    }
  }
  await attachMetrics('PREVIEW_FIRST_ACTIONS', [
    JSON.stringify(measurements),
  ])
  await chooseOption(page, select, '__custom__')
  const custom = page.getByRole('textbox', { name: '编辑文件', exact: true })
  await expect(custom).toBeFocused()
  await custom.fill('custom.js')
  await page.getByRole('button', { name: '选择已有文件', exact: true }).click()
  await expect(select).toHaveAttribute('data-value', 'custom.js')
  await chooseOption(page, select, 'module.ts')
  await expect(page.getByRole('combobox', { name: '编辑文件', exact: true })).toHaveAttribute('data-value', 'module.ts')
})
