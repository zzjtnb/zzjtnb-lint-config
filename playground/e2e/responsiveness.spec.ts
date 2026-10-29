import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('冷启动立即检查期间主线程保持响应', async ({ page }) => {
  test.setTimeout(480000)
  await page.addInitScript(() => {
    const measures: number[] = []
    Object.assign(window, { longTasks: measures })
    new PerformanceObserver(list => measures.push(...list.getEntries().map(entry => entry.duration))).observe({ type: 'longtask', buffered: true })
  })
  const timer = setInterval(async () => await attachMetrics('RUNTIME_STATUS', [await page.locator('.runtime-state').textContent()]), 20000)
  const start = Date.now()
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.source-panel .monaco-diff-editor')).toBeVisible({ timeout: 90000 })
  const theme = page.getByRole('button', { name: /切换深色|切换浅色/ })
  const interaction = Date.now()
  await theme.click({ timeout: 3000 })
  await attachMetrics('PREPARATION_INTERACTION', [Date.now() - interaction])
  try {
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
    await page.getByRole('button', { name: '检查代码', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 420000 })
  }
  finally { clearInterval(timer) }
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  await expect(page.locator('.diagnostic').first()).toBeVisible()
  const diagnosticCount = await page.locator('.diagnostic').count()
  await page.getByRole('searchbox', { name: '筛选诊断', exact: true }).fill('不存在的规则筛选')
  await expect(page.locator('.diagnostic')).toHaveCount(0)
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('')
  await expect(page.locator('.diagnostic')).toHaveCount(diagnosticCount)
  await page.locator('.diagnostic').first().click()
  await expect(page.locator('.rule-card.selected')).toBeVisible()
  await expect(page.locator('.console-panel .xterm-screen')).toBeVisible()
  const tasks = await page.evaluate(() => Reflect.get(window, 'longTasks'))
  await attachMetrics('COLD_RESPONSIVENESS', [
    JSON.stringify({ wall: Date.now() - start, tasks }),
  ])
  const restartStart = Date.now()
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.url().endsWith('/runtime/eslint.json'))
      resources.push(request.url())
  })
  await page.getByRole('button', { name: '重启沙箱', exact: true }).click()
  await expect(page.getByRole('button', { name: '重启沙箱', exact: true })).toBeEnabled({ timeout: 30000 })
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
  expect(resources).toEqual([])
  await attachMetrics('SERVICE_RESTART_MS', [Date.now() - restartStart])
  for (const mode of ['Stylelint', 'Markdownlint', 'ESLint']) {
    await page.getByRole('link', { name: mode, exact: true }).click()
    for (const action of ['检查代码', '预览修复']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: '应用修复到源码' })).toBeVisible()
    if (mode === 'Stylelint') {
      await page.locator('.diagnostic').first().click()
      await expect(page.getByRole('textbox', { name: '修复结果', exact: true })).toBeFocused()
    }
    await page.getByRole('button', { name: '应用修复到源码' }).click()
  }
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await expect(page).toHaveURL(/#\/eslint\/files$/)
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.files-page .notice.error')).toHaveCount(0)
  await expect(page.getByRole('treeitem').first()).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/#\/(?:eslint|stylelint|markdownlint)\/experiment$/)
  await page.setViewportSize({ width: 390, height: 844 })
  const areas = page.getByRole('tablist', { name: '实验工作区' })
  await areas.getByRole('tab', { name: '结果', exact: true }).click()
  await expect(page.locator('.diagnostics')).toBeVisible()
  await expect(page.locator('.console-panel .xterm-screen')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(Math.max(0, ...tasks)).toBeLessThan(1000)
})
