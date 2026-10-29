import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('静态工作台导航、配置展示与窄屏布局', async ({ page }) => {
  await page.goto('/#/eslint/overview')
  await expect(page.getByRole('heading', { name: '配置组成', exact: true })).toBeVisible()
  const javascript = page.locator('.configuration').filter({ hasText: 'antfu/javascript/rules' }).first()
  await javascript.locator('.disclosure-trigger').click()
  await expect(javascript.getByRole('heading', { name: /插件/ })).toBeVisible()
  await expect(javascript.getByRole('heading', { name: /规则（/ })).toBeVisible()
  await expect(javascript.locator('.rule-declarations code').first()).toBeVisible()
  await page.getByRole('link', { name: '规则目录', exact: true }).click()
  await page.getByRole('searchbox', { name: '搜索规则名称或说明' }).fill('no-console')
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  })).toHaveCount(1)
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await expect(page).toHaveURL(/#\/eslint\/files$/)
  await expect(page.getByRole('heading', { name: '工作区文件与配置匹配' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('searchbox', { name: '搜索规则名称或说明' })).toHaveValue('no-console')
  await page.getByRole('link', { name: '项目接入', exact: true }).click()
  await page.getByRole('button', { name: '保存配置', exact: true }).click()
  await expect(page).toHaveURL(/#\/eslint\/setup$/)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('三个真实引擎的检查与修复，通过常驻服务运行', async ({ page }) => {
  await page.goto('/#/eslint/experiment')
  for (const mode of ['Markdownlint', 'Stylelint', 'ESLint']) {
    await page.getByRole('link', { name: mode, exact: true }).click()
    await page.getByRole('button', { name: '检查代码', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 150000 })
    await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    await expect(page.locator('.diagnostic').first()).toBeVisible()
    await page.getByRole('button', { name: '预览修复', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
    await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    await expect(page.getByRole('button', { name: '应用修复到源码' })).toBeVisible()
    await page.getByRole('button', { name: '应用修复到源码' }).click()
    await expect(page.getByText('输入已变化', { exact: true })).toBeVisible()
  }
})

test('文件分组和真实工作区性能四种排行', async ({ page }) => {
  test.setTimeout(600000)
  const preparation = Date.now()
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
  await attachMetrics('WORKSPACE_ENGINE_PREPARATION_MS', [Date.now() - preparation])
  const started = Date.now()
  await page.goto('/#/eslint/files')
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.files-page .error')).toHaveCount(0)
  await expect(page.getByRole('treeitem').first()).toBeVisible()
  await page.getByRole('button', { name: '匹配分组', exact: true }).click()
  await expect(page.locator('.file-entry').first()).toBeVisible()
  await page.screenshot({
    path: fileURLToPath(new URL('../../.tmp/playground/validation/implementation/files-verified.png', import.meta.url)),
  })
  await page.getByRole('link', { name: '统计与性能', exact: true }).click()
  await page.getByRole('button', { name: '运行工作区性能分析', exact: true }).click()
  await expect(page.getByRole('button', { name: '运行工作区性能分析', exact: true })).toBeEnabled({ timeout: 150000 })
  await expect(page.locator('.stats-page .error')).toHaveCount(0)
  for (const tab of ['慢规则', '慢插件', '慢文件', '慢任务']) {
    await page.getByRole('button', { name: tab, exact: true }).click()
    await expect(page.locator('.ranking').first()).toBeVisible()
  }
  await page.screenshot({
    path: fileURLToPath(new URL('../../.tmp/playground/validation/implementation/stats-verified.png', import.meta.url)),
  })
  await attachMetrics('WORKSPACE_MATCH_AND_STATS_MS', [Date.now() - started])
})

test('规则修改、非法 JSON 保护和完整导出', async ({ page }) => {
  await page.goto('/#/eslint/rules')
  await page.getByRole('searchbox', { name: '搜索规则名称或说明' }).fill('no-console')
  await page.locator('tbody tr').first().getByRole('button').click()
  await page.locator('.levels').getByRole('button', { name: '关闭', exact: true }).click()
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  await expect(page.getByRole('button', { name: '查看源码变更 1' })).toBeVisible()
  await page.getByRole('link', { name: '规则目录', exact: true }).click()
  await page.getByRole('textbox', { name: '完整规则配置 / JSON' }).fill('{invalid')
  await page.locator('.levels').getByRole('button', { name: '错误', exact: true }).click()
  await expect(page.locator('.field-error')).toContainText('JSON 格式无效')
  await page.getByRole('link', { name: '项目接入', exact: true }).click()
  await expect(page.locator('#save pre')).toContainText('project/overrides')
  await expect(page.locator('#save pre')).toContainText('no-console')
  await expect(page.locator('#save pre')).toContainText('off')
})

test('方案对齐：语言开关、实时差异、恢复确认和窄屏任务切换', async ({ page }) => {
  await page.goto('/#/eslint/experiment')
  const language = page.getByRole('switch', { name: 'Vue 语言集成', exact: true })
  await expect(language).toBeChecked()
  await language.uncheck()
  await page.getByRole('switch', { name: 'Markdown 语言集成', exact: true }).check()
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  await page.getByRole('button', { name: '查看源码变更 2', exact: true }).click()
  await expect(page.locator('.source-changes')).toContainText('vue: false')
  await expect(page.locator('.source-changes')).toContainText('markdown: true')
  await page.getByRole('tab', { name: '可视化配置', exact: true }).click()
  await page.getByRole('button', { name: '恢复基础配置', exact: true }).click()
  await page.getByRole('button', { name: '保留草稿', exact: true }).click()
  await expect(language).not.toBeChecked()
  await page.getByRole('button', { name: '恢复基础配置', exact: true }).click()
  await page.getByRole('button', { name: '确认恢复', exact: true }).click()
  await expect(language).toBeChecked()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.source-panel')).toBeVisible()
  await expect(page.locator('.config-panel')).toBeHidden()
  const areas = page.getByRole('tablist', { name: '实验工作区' })
  await areas.getByRole('tab', { name: '配置', exact: true }).click()
  await expect(page.locator('.config-panel')).toBeVisible()
  await expect(page.locator('.source-panel')).toBeHidden()
  await areas.getByRole('tab', { name: '结果', exact: true }).click()
  await expect(page.locator('.diagnostics')).toBeVisible()
  await expect(page.locator('.config-panel')).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('进入实验提前准备服务，检查时不读取大快照', async ({ page }) => {
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/runtime/'))
      resources.push(request.url())
  })
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 180000 })
  expect(resources.some(url => url.endsWith('/eslint.json'))).toBe(true)
  expect(resources.some(url => url.endsWith('.bin'))).toBe(false)
  const count = resources.length
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  expect(resources.filter(url => url.endsWith('/eslint.json'))).toHaveLength(1)
  expect(resources.length).toBeGreaterThanOrEqual(count)
})
