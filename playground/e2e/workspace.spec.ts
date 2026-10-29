import { Buffer } from 'node:buffer'
import { expect, test } from '@playwright/test'
import { replaceEditor } from './helpers'

test('文件匹配独立于预览与检查，选择原地查看，内容变化保留过期结果', async ({ page }) => {
  test.setTimeout(480000)
  await page.goto('/#/markdownlint/files')
  const upload = page.locator('.file-import input[type=file]').nth(1)
  await upload.setInputFiles([
    {
      name: 'first.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# First\n\ntext  \n'),
    },
    {
      name: 'second.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# Second\n\ntext  \n'),
    },
  ])
  await page.getByRole('treeitem').filter({ hasText: 'first.md' }).click()
  await page.getByRole('button', { name: '文件列表', exact: true }).click()
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 360000 })
  await expect(page.locator('.file-entry')).toHaveCount(2)
  await page.locator('.file-entry').filter({ hasText: 'second.md' }).click()
  await expect(page).toHaveURL(/#\/markdownlint\/files$/)
  await expect(page.getByLabel('当前定位文件', { exact: true })).toHaveText('second.md')
  await page.getByRole('button', { name: '使用此文件实验', exact: false }).click()
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await page.goBack()
  await expect(page.locator('.file-entry')).toHaveCount(2)
  await expect(page.locator('.stale-result')).toHaveCount(0)
  await upload.setInputFiles({
    name: 'third.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Third\n'),
  })
  await expect(page.locator('.stale-result')).toBeVisible()
  await expect(page.locator('.file-entry')).toHaveCount(3)
  await page.locator('.file-entry').filter({ hasText: 'third.md' }).click()
  await expect(page.locator('.file-detail-status')).toContainText('待解析')
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.stale-result')).toHaveCount(0)
  await page.getByRole('button', { name: '匹配分组', exact: true }).click()
  await expect(page.locator('.group-trigger')).toHaveCount(1)
  await page.getByRole('button', { name: '全部展开', exact: true }).click()
  await expect(page.locator('.file-entry')).toHaveCount(3)
  await page.getByRole('button', { name: '全部收起', exact: true }).click()
  await expect(page.locator('.file-entry')).toHaveCount(0)
  await page.getByRole('button', { name: '文件列表', exact: true }).click()
  await page.locator('.file-entry').filter({ hasText: 'first.md' }).click()
  await page.getByRole('tab', { name: /全部规则/ }).click()
  const rule = page.locator('.rule-relation').first()
  const ruleName = await rule.locator('.relation-trigger code').textContent()
  await rule.locator('.relation-trigger').click()
  const ruleLink = rule.getByRole('link', { name: '查看与编辑规则', exact: false })
  await ruleLink.click()
  await expect(page.locator('.rule-detail h2')).toHaveText(ruleName!)
  await page.goBack()
  await upload.setInputFiles({
    name: 'second.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from('# Reimported\n\nnew content\n'),
  })
  await page.locator('.file-entry').filter({ hasText: 'second.md' }).click()
  await expect(page.locator('.stale-result')).toBeVisible()
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await expect(page.locator('.source-panel .view-lines').first()).toContainText('Reimported', { timeout: 90000 })
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await page.getByRole('button', { name: '清除导入', exact: true }).click()
  await expect(page.getByLabel('当前定位文件', { exact: true })).toHaveText('document.md')
})

test('规则无结果不残留旧详情，清空搜索可恢复列表', async ({ page }) => {
  await page.goto('/#/eslint/rules')
  const search = page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true })
  await search.fill('no-console')
  await expect(page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  })).toHaveCount(1)
  await page.locator('tbody tr').filter({
    has: page.locator('code', { hasText: /^no-console$/ }),
  }).getByRole('button').click()
  await search.fill('不存在的规则名称')
  await expect(page.locator('tbody tr')).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: '完整规则配置 / JSON', exact: true })).toHaveCount(0)
  await page.getByRole('searchbox', { name: '搜索规则名称或说明', exact: true }).fill('')
  await expect(page.locator('tbody tr').first()).toBeVisible()
  await expect(page.getByRole('button', { name: '下一页规则', exact: true })).toBeEnabled()
})

test('Stylelint 目录原地查看 CSS、SCSS、Vue、HTML 结果及真实忽略配置', async ({ page }) => {
  test.setTimeout(480000)
  await page.goto('/#/stylelint/files')
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 360000 })
  await expect(page.locator('.files-page .notice.error')).toHaveCount(0)
  for (const name of [
    'stylesheet.css',
    'stylesheet.scss',
    'component.vue',
    'document.html',
  ]) {
    await page.getByRole('treeitem').filter({ hasText: name }).click()
    await expect(page).toHaveURL(/#\/stylelint\/files$/)
    await expect(page.getByLabel('当前定位文件', { exact: true })).toHaveText(name)
    await page.getByRole('tab', { name: /全部规则/ }).click()
    await expect(page.locator('.rule-relation').first()).toBeVisible()
  }
  const firstRule = await page.locator('.rule-relation .relation-trigger code').first().textContent()
  const size = (await page.locator('.files-size').boundingBox())!.height
  const nextPage = page.getByRole('button', { name: '下一页文件规则', exact: true })
  await expect(nextPage).toBeInViewport()
  await nextPage.click()
  await expect(page.locator('.rule-relation .relation-trigger code').first()).not.toHaveText(firstRule!)
  expect((await page.locator('.files-workspace').boundingBox())!.height).toBeCloseTo(size, 0)
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  const editor = page.locator('.source-config .view-lines')
  await expect(editor).toBeVisible({ timeout: 90000 })
  await replaceEditor(page, editor, 'import { zzjtnb } from "@zzjtnb/stylelint-config"; export default zzjtnb({ ignoreFiles: ["**/stylesheet.scss"] })')
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await page.getByRole('button', { name: '解析工作区匹配', exact: true }).click()
  await expect(page.getByRole('button', { name: '解析工作区匹配', exact: true })).toBeEnabled({ timeout: 70000 })
  await page.getByRole('treeitem').filter({ hasText: 'stylesheet.scss' }).click()
  await expect(page.locator('.file-detail-status')).toContainText('被忽略或未包含')
  await page.getByRole('tab', { name: /全部规则/ }).click()
  await expect(page.locator('.rule-relation').first()).toBeVisible()
  await page.locator('.rule-relation .relation-trigger').first().click()
  await expect(page.locator('.rule-relation .matched-file').filter({ hasText: 'stylesheet.scss' })).toHaveCount(0)
})
