import { expect, test } from '@playwright/test'
import { chooseOption } from './helpers'

test('切换工具清除不适用的规则搜索与插件筛选', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/rules')
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('no-console')
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  })).toHaveCount(1)
  await page.getByRole('link', { name: 'Stylelint', exact: true }).click()
  await expect(page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true })).toHaveValue('')
  await expect(page.locator('tbody tr').first()).toBeVisible()
  await expect(page.locator('.plugins').getByRole('button', { name: /^order/ })).toBeVisible()
  await page.locator('.plugins').getByRole('button', { name: /^order/ }).click()
  await page.getByRole('link', { name: 'Markdownlint', exact: true }).click()
  await expect(page.locator('.plugins').getByRole('button', { name: /^全部插件/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr').first()).toBeVisible()
  await page.getByRole('navigation', { name: '检查工具' }).getByRole('link', { name: 'ESLint', exact: true }).click()
  await page.getByRole('group', { name: '规则属性', exact: true }).getByRole('button', { name: '废弃', exact: true }).click()
  await page.evaluate(() => {
    location.hash = '/eslint/rules?rule=no-console'
  })
  await expect(page.getByRole('group', { name: '规则属性', exact: true }).getByRole('button', { name: '全部属性', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  })).toHaveCount(1)
  await expect(page.locator('.rule-detail h2')).toHaveText('no-console')
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('not-a-rule')
  await page.evaluate(() => {
    location.hash = '/eslint/rules?plugin=eslint'
  })
  await expect(page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true })).toHaveValue('')
  await expect(page.locator('tbody tr').first()).toBeVisible()
})

test('六页信息与图标、文件搜索、规则筛选及窄屏导航', async ({ page }) => {
  // 独立验证界面：阻断联网安装，规则目录仍读取真实生成元数据。
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/overview')
  await expect(page.getByLabel('配置摘要')).toBeVisible()
  await expect(page.getByLabel('配置摘要').locator('strong').first()).not.toHaveText('0')
  const icon = page.getByLabel('配置摘要').locator('.i-lucide-layers')
  expect(await icon.evaluate(element => getComputedStyle(element).maskImage)).not.toBe('none')
  await page.getByRole('button', { name: /三个工具准备状态/ }).click()
  await expect(page.locator('.sandbox-status-panel li')).toHaveCount(3)
  await page.keyboard.press('Escape')
  await page.getByRole('textbox', { name: '搜索配置内容', exact: true }).fill('this-config-does-not-exist')
  await page.getByRole('button', { name: '清除搜索', exact: true }).click()
  await expect(page.locator('.configuration').first()).toBeVisible()
  await chooseOption(page, page.getByRole('combobox', { name: '按配置内容筛选', exact: true }), 'rules')
  await expect(page.locator('.configuration').first()).toBeVisible()
  await page.getByRole('button', { name: '重置配置筛选', exact: true }).click()
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await expect(page.getByLabel('文件匹配摘要')).toBeVisible()
  await page.getByRole('textbox', { name: '筛选工作区文件', exact: true }).fill('component.vue')
  await expect(page.locator('[role="treeitem"][data-file-path]')).toHaveCount(1)
  await page.getByRole('textbox', { name: '筛选工作区文件', exact: true }).fill('no-such-file')
  await expect(page.locator('[role="treeitem"][data-file-path]')).toHaveCount(0)
  await page.getByRole('button', { name: '清除搜索', exact: true }).click()
  await expect(page.locator('[role="treeitem"][data-file-path]')).toHaveCount(6)
  await page.getByRole('link', { name: '规则目录', exact: true }).click()
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('no-console')
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  })).toHaveCount(1)
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('')
  await expect(page.getByRole('button', { name: '全部', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('link', { name: '项目接入', exact: true }).click()
  await expect(page.getByRole('button', { name: '复制运行命令', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await expect(page.locator('.file-heading button')).toHaveCount(0)
  await page.getByRole('button', { name: '重命名文件', exact: true }).click()
  await page.getByRole('textbox', { name: '新的文件路径', exact: true }).fill('src/renamed.ts')
  await page.getByRole('button', { name: '保存文件名', exact: true }).click()
  await expect(page.getByRole('combobox', { name: '编辑文件', exact: true })).toHaveAttribute('data-value', 'src/renamed.ts')
  await page.getByRole('button', { name: '恢复初始代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认恢复代码', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '保留当前代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '清理沙箱', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重置沙箱', exact: true }).click()
  await expect(page.getByRole('button', { name: '确认重装', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '取消重装', exact: true }).click()
  await expect(page.getByRole('button', { name: '重启沙箱', exact: true })).toBeVisible()
  for (const name of [
    '配置总览',
    '规则目录',
    '文件匹配',
    '代码实验',
    '统计与性能',
    '项目接入',
  ]) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.getByRole('main', { name, exact: true })).toBeVisible()
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.setViewportSize({ width: 1600, height: 1100 })
  }
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await page.screenshot({ path: '../.tmp/playground/validation/refinement/actions-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '../.tmp/playground/validation/refinement/actions-mobile.png', fullPage: true })
})

test('文件支持实际拖入，代码实验不预先加载图表资源', async ({ page }) => {
  const charts: string[] = []
  page.on('request', (request) => {
    if (/\/assets\/(?:chart|echarts-vendor)-.*\.js/.test(request.url()))
      charts.push(request.url())
  })
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/experiment')
  await expect(page.getByRole('button', { name: '重命名文件', exact: true })).toBeVisible()
  expect(charts).toEqual([])
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  const transfer = await page.evaluateHandle(() => {
    const data = new DataTransfer()
    data.items.add(new File(['const dropped = 1\n'], 'dropped.ts', { type: 'text/typescript' }))
    return data
  })
  await page.locator('.files-page').dispatchEvent('drop', { dataTransfer: transfer })
  await expect(page.locator('[role="treeitem"][data-file-path]')).toHaveCount(1)
  await expect(page.locator('[role="treeitem"][data-file-path]')).toContainText('dropped.ts')
  await page.getByRole('button', { name: '清除导入', exact: true }).click()
  await expect(page.locator('[role="treeitem"][data-file-path]')).toHaveCount(6)
})
