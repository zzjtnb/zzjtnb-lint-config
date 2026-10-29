import { expect, test } from '@playwright/test'

test('未解析时完整列出配置与规则，切换文件不缩减目录', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/stylelint/files')
  const catalog = await page.request.get('/metadata/stylelint/catalog.json')
  const definitions = (await catalog.json()).rules as { name: string }[]
  await expect(page.getByRole('tab', { name: /^全部配置/ })).toBeVisible()
  await expect(page.locator('.matched-configs > li')).toHaveCount(1)
  await expect(page.locator('.matched-configs .match-count')).toHaveText('尚未解析')
  const rules = page.getByRole('tab', { name: /^全部规则/ })
  await expect(rules).toHaveText(`全部规则 ${definitions.length}`)
  await rules.click()
  const search = page.getByRole('textbox', { name: '筛选完整规则目录' })
  const scss = definitions.find(rule => rule.name.startsWith('scss/'))!
  await search.fill(scss.name)
  await expect(page.locator('.rule-relation').first()).toContainText(scss.name)
  await expect(page.locator('.rule-relation .match-count').first()).toHaveText('尚未解析')
  for (const name of ['stylesheet.scss', 'stylesheet.css']) {
    await page.getByRole('treeitem').filter({ hasText: name }).click()
    await expect(rules).toHaveText(`全部规则 ${definitions.length}`)
    await expect(page.locator('.rule-relation').first()).toContainText(scss.name)
  }
  await page.getByRole('link', { name: '规则目录', exact: true }).click()
  await expect(page.getByRole('button', { name: '全部', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.directory-summary')).toContainText(`共 ${definitions.length} 条规则`)
})

test('规则反查所有配置文件与原生参数，选择其他文件仍保留关系', async ({ page }) => {
  test.setTimeout(480000)
  await page.goto('/#/stylelint/files')
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 360000 })
  await page.getByRole('tab', { name: /^全部配置/ }).click()
  await expect(page.locator('.matched-configs > li')).toHaveCount(1)
  await expect(page.locator('.matched-configs .match-count')).toHaveText('匹配未公开')
  await page.getByRole('tab', { name: /^全部规则/ }).click()
  await page.getByRole('textbox', { name: '筛选完整规则目录' }).fill('scss/at-rule-no-unknown')
  const rule = page.locator('.rule-relation').filter({
    has: page.locator('.relation-trigger code', { hasText: /^scss\/at-rule-no-unknown$/ }),
  })
  await expect(rule.locator('.match-count')).toHaveText('2 个文件')
  await rule.locator('.relation-trigger').click()
  await expect(rule.locator('.matched-file')).toHaveCount(2)
  await expect(rule.locator('.matched-value').first()).not.toBeEmpty()
  await page.getByRole('treeitem').filter({ hasText: 'stylesheet.css' }).click()
  await expect(rule.locator('.matched-file')).toHaveCount(2)
  await expect(rule.locator('.match-count')).toHaveText('2 个文件')
  await rule.locator('.matched-file').filter({ hasText: 'stylesheet.scss' }).click()
  await expect(page).toHaveURL(/stylelint\/files$/)
  await expect(page.getByLabel('当前定位文件', { exact: true })).toHaveText('stylesheet.scss')
  await expect(rule.locator('.matched-file').filter({ hasText: 'stylesheet.scss' })).toHaveClass(/current/)
})

test('ESLint 完整配置按项反查匹配文件，切换文件不删除配置项', async ({ page }) => {
  test.setTimeout(480000)
  await page.goto('/#/eslint/files')
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 360000 })
  const all = page.locator('.matched-configs > li')
  const count = await all.count()
  expect(count).toBeGreaterThan(20)
  const entry = all.filter({
    has: page.locator('.relation-trigger code', { hasText: /^antfu\/javascript\/rules$/ }),
  })
  await entry.locator('.relation-trigger').click()
  await expect(entry.locator('.matched-file').first()).toBeVisible()
  const matched = await entry.locator('.matched-file').count()
  await expect(entry.locator('.match-count')).toHaveText(`${matched} 个文件`)
  await page.getByRole('treeitem').filter({ hasText: 'module.json' }).click()
  await expect(all).toHaveCount(count)
  await expect(entry.locator('.matched-file')).toHaveCount(matched)
  await entry.locator('.matched-file').first().click()
  await expect(page).toHaveURL(/eslint\/files$/)
})
