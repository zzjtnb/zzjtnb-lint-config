import { expect, test } from '@playwright/test'
import { attachMetrics, replaceEditor } from './helpers'

test('连续检查耗时、配置更新、错误恢复与重启', async ({ page }) => {
  test.setTimeout(600000)
  const preparationStart = Date.now()
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
  await attachMetrics('RUNTIME_PREPARATION', [Date.now() - preparationStart])
  const times = []
  for (let n = 0; n < 3; n++) {
    const start = Date.now()
    await page.getByRole('button', { name: '检查代码', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
    await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    times.push({ wall: Date.now() - start, result: await page.locator('.result-summary').textContent() })
  }
  await attachMetrics('CHECK_SPEED', [
    JSON.stringify(times),
  ])
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  const editor = page.locator('.source-config .view-lines')
  await replaceEditor(page, editor, 'export default [{ files: ["**/*.ts"], rules: {} }]')
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  await expect(page.locator('.result-summary')).toContainText('0 个错误 / 0 个警告')
  await replaceEditor(page, editor, 'export default { broken:')
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.locator('.diagnostics .notice.error')).toBeVisible({ timeout: 70000 })
  await replaceEditor(page, editor, 'export default [{ files: ["**/*.ts"], rules: {} }]')
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  await page.getByRole('button', { name: '重启沙箱', exact: true }).click()
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 150000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  await expect(page.locator('.result-summary')).toContainText('0 个错误 / 0 个警告')
})
