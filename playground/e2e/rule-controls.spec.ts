import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
})

test('插件、使用情况和状态三组直接点选，图标与筛选复位一致', async ({ page }) => {
  await page.goto('/#/eslint/rules')
  await expect(page.locator('.rules-controls .filter-row')).toHaveCount(3)
  await expect(page.getByRole('combobox', { name: '规则属性' })).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: '预览文件' })).toHaveCount(0)
  const states = page.getByRole('group', { name: '规则属性', exact: true })
  const fixable = states.getByRole('button', { name: '可修复', exact: true })
  await fixable.click()
  await expect(fixable).toHaveAttribute('aria-pressed', 'true')
  await expect(fixable.locator('.i-lucide-wrench')).toBeVisible()
  await expect(page.locator('tbody tr').first()).toContainText('可修复')
  await states.getByRole('button', { name: '全部属性', exact: true }).click()
  await expect(states.getByRole('button', { name: '全部属性', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('searchbox', { name: '搜索规则名称或说明' }).fill('eqeqeq')
  await expect(page.getByRole('button', { name: '清除筛选', exact: true })).toHaveCount(0)
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^eqeqeq$/ }),
  })).toHaveCount(1)
  await page.getByRole('searchbox', { name: '搜索规则名称或说明' }).fill('')
  await expect(page.locator('tbody tr')).toHaveCount(40)
  const header = (await page.locator('.rules-controls').boundingBox())!
  expect(header.y + header.height).toBeLessThan((await page.locator('.rule-directory').boundingBox())!.y)
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('规则默认参数与共享配置分别展示，覆盖颜色跟随实际值且无效 JSON 不切换状态', async ({ page }) => {
  await page.goto('/#/eslint/rules?rule=eqeqeq')
  const detail = page.locator('.rule-detail')
  await expect(detail.getByRole('heading', { name: '我的覆盖', exact: true })).toHaveText('我的覆盖')
  const defaults = detail.getByRole('region', { name: '规则默认参数', exact: true })
  expect(JSON.parse((await defaults.locator('pre').textContent())!)).toEqual(['always'])
  const current = detail.getByRole('region', { name: '共享或当前文件的配置值', exact: true })
  expect(JSON.parse((await current.locator('pre').textContent())!)).toEqual([2, 'smart'])
  await expect(detail.locator('.rule-meta .i-lucide-wrench')).toBeVisible()
  const levels = page.getByRole('group', { name: '规则覆盖级别', exact: true })
  const inherit = levels.getByRole('button', { name: '继承', exact: true })
  await expect(inherit).toHaveAttribute('aria-pressed', 'true')
  const inheritedColor = await inherit.evaluate(element => getComputedStyle(element).color)
  const warn = levels.getByRole('button', { name: '警告', exact: true })
  await warn.click()
  await expect(warn).toHaveAttribute('aria-pressed', 'true')
  expect(await warn.evaluate(element => getComputedStyle(element).color)).not.toBe(inheritedColor)
  const json = page.getByRole('textbox', { name: '完整规则配置 / JSON' })
  expect(JSON.parse(await json.inputValue())[0]).toBe('warn')
  await json.fill('{invalid')
  await levels.getByRole('button', { name: '错误', exact: true }).click()
  await expect(detail.locator('.field-error')).toContainText('JSON 格式无效')
  await expect(warn).toHaveAttribute('aria-pressed', 'true')
  await json.fill('["error", "smart"]')
  await detail.getByRole('button', { name: '保存覆盖', exact: true }).click()
  const error = levels.getByRole('button', { name: '错误', exact: true })
  await expect(error).toHaveAttribute('aria-pressed', 'true')
  expect(await error.evaluate(element => getComputedStyle(element).color)).not.toBe(await warn.evaluate(element => getComputedStyle(element).color))
  await inherit.click()
  await expect(inherit).toHaveAttribute('aria-pressed', 'true')
})

test('分页显示完整行，最后一行不在固定滚动视口中被截断', async ({ page }) => {
  await page.goto('/#/eslint/rules')
  await expect(page.locator('tbody tr')).toHaveCount(40)
  await page.locator('.pagination-numbers button').last().click()
  const last = page.locator('tbody tr').last()
  await last.scrollIntoViewIfNeeded()
  const viewport = page.getByRole('region', { name: '规则目录列表', exact: true })
  const rowBox = (await last.boundingBox())!
  const viewportBox = (await viewport.boundingBox())!
  expect(rowBox.y + rowBox.height).toBeLessThanOrEqual(viewportBox.y + viewportBox.height + 1)
  expect(await viewport.evaluate(element => element.scrollHeight - element.clientHeight)).toBeLessThanOrEqual(1)
  await expect(page.getByRole('button', { name: '下一页规则', exact: true })).toBeDisabled()
})

test('配置规则名称直接打开带图标的弹层，代码高亮随主题切换', async ({ page }) => {
  await page.goto('/#/eslint/overview')
  await expect(page.locator('.context-bar')).not.toContainText('预览文件')
  const setup = page.locator('.configuration').filter({ hasText: 'antfu/javascript/setup' }).first()
  await setup.locator('.disclosure-trigger').click()
  await expect(setup.locator('.options-grid article:visible .code-block .shiki span[style]').first()).toBeVisible()
  const light = await setup.locator('.code-block .shiki span[style]').first().evaluate(element => getComputedStyle(element).color)
  await page.getByRole('button', { name: '切换深色', exact: true }).click()
  expect(await setup.locator('.code-block .shiki span[style]').first().evaluate(element => getComputedStyle(element).color)).not.toBe(light)
  const rules = page.locator('.configuration').filter({ hasText: 'antfu/javascript/rules' }).first()
  await rules.locator('.disclosure-trigger').click()
  const trigger = rules.getByRole('button', { name: 'eqeqeq 的操作', exact: true })
  await expect(rules.locator('.i-lucide-ellipsis')).toHaveCount(0)
  const row = rules.locator('.rule-declarations > article').filter({
    has: page.getByRole('button', { name: 'eqeqeq 的操作', exact: true }),
  })
  const descriptionBox = (await row.locator('.rule-description').boundingBox())!
  const iconsBox = (await row.locator('.rule-attributes').boundingBox())!
  expect(iconsBox.x).toBeGreaterThanOrEqual(descriptionBox.x + descriptionBox.width)
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('button', { name: '复制名称', exact: true })).toBeVisible()
  await expect(dialog.locator('.i-lucide-copy')).toBeVisible()
  await expect(rules.locator('.rule-attributes .i-lucide-wrench').first()).toBeVisible()
  await expect(rules.locator('.declared-value')).toHaveCount(0)
  await expect(dialog).not.toContainText('本配置声明为')
  await expect(dialog.locator('.code-block .shiki')).toBeVisible()
  expect(JSON.parse((await dialog.locator('pre').textContent())!)).toEqual(['error', 'smart'])
  await dialog.getByRole('tab', { name: '规则默认参数', exact: true }).click()
  expect(JSON.parse((await dialog.locator('pre').textContent())!)).toEqual(['always'])
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 800, height: 600 })
  await trigger.click()
  await expect.poll(async () => {
    const popup = (await dialog.boundingBox())!
    return popup.y >= 0 && popup.y + popup.height <= 600
  }).toBe(true)
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
})
