import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { chooseOption } from './helpers'

let directory: string
test.beforeAll(async () => {
  const root = fileURLToPath(new URL('../../.tmp/playground/status/fixtures', import.meta.url))
  await mkdir(root, { recursive: true })
  directory = await mkdtemp(join(root, 'workspace-'))
  await mkdir(join(directory, 'src/components'), { recursive: true })
  await mkdir(join(directory, 'styles'), { recursive: true })
  await Promise.all([
    writeFile(join(directory, 'src/index.ts'), 'export const value = 1\n'),
    writeFile(join(directory, 'src/components/button.vue'), '<template><button>目录测试</button></template>\n'),
    writeFile(join(directory, 'styles/theme.css'), 'a { color: red }\n'),
    writeFile(join(directory, 'README.md'), '# 目录测试\n'),
  ])
})

test('实际目录保留层级，文件原地选择、右键复制、状态筛选、分栏与窄屏可用', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/files')
  await page.locator('input[webkitdirectory]').setInputFiles(directory)
  const tree = page.getByRole('tree', { name: '工作区目录树' })
  await expect(tree.getByRole('treeitem').filter({ hasText: /^导入工作区$/ })).toBeVisible()
  await page.getByRole('textbox', { name: '筛选工作区文件', exact: true }).fill('button.vue')
  const file = tree.getByRole('treeitem').filter({ hasText: 'button.vue' })
  await expect(file).toHaveAttribute('aria-level', '5')
  await file.click()
  await expect(page).toHaveURL(/eslint\/files$/)
  await expect(page.getByLabel('当前定位文件', { exact: true })).toContainText('src/components/button.vue')
  await page.getByRole('tab', { name: '文件信息', exact: true }).click()
  await expect(page.locator('.source-preview')).toContainText('目录测试')
  await file.click({ button: 'right' })
  await expect(page.getByRole('menuitem', { name: '查看匹配详情', exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: '复制文件路径', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/src\/components\/button.vue$/)
  await page.getByRole('textbox', { name: '筛选工作区文件', exact: true }).fill('')
  await page.getByRole('button', { name: '全部收起', exact: true }).click()
  await expect(tree.getByRole('treeitem')).toHaveCount(1)
  await page.getByRole('button', { name: '全部展开', exact: true }).click()
  await expect(tree.locator('[data-file-path]')).toHaveCount(4)
  await chooseOption(page, page.getByRole('combobox', { name: '筛选文件匹配状态', exact: true }), 'unsupported')
  await expect(tree.locator('[data-file-path]')).toHaveCount(2)
  await tree.getByRole('treeitem').filter({ hasText: 'theme.css' }).click()
  await expect(page.getByRole('button', { name: '使用此文件实验', exact: false })).toBeDisabled()
  await chooseOption(page, page.getByRole('combobox', { name: '筛选文件匹配状态', exact: true }), 'all')
  const pane = page.locator('.files-explorer')
  const width = (await pane.boundingBox())!.width
  await page.getByRole('separator', { name: '调整文件目录与匹配详情大小' }).focus()
  await page.keyboard.press('ArrowRight')
  expect((await pane.boundingBox())!.width).toBeGreaterThan(width)
  await expect(page.getByRole('region', { name: '工作区文件', exact: true })).toBeVisible()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.files-explorer')).toBeVisible()
  await expect(page.locator('.file-inspector')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('规则右键菜单、官方页码导航及独立滚动区', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/rules')
  await page.getByRole('button', { name: '第 2 页规则', exact: true }).click()
  await expect(page.getByRole('button', { name: '第 2 页规则', exact: true })).toHaveAttribute('data-selected')
  await expect(page.getByRole('region', { name: '规则目录列表', exact: true })).toBeVisible()
  const search = page.getByRole('searchbox', { name: '搜索规则名称或说明' })
  await search.fill('no-console')
  const row = page.locator('tbody tr').first()
  await row.click({ button: 'right' })
  await page.getByRole('menuitem', { name: '查看与编辑规则', exact: true }).click()
  await expect(page.locator('.rule-detail h2')).toContainText('no-console')
  await expect(page.getByRole('menu')).toHaveCount(0)
})
