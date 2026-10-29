import { expect, test } from '@playwright/test'

test('目录树键盘选择后原地查看匹配，再明确进入实验', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/files')
  await page.getByRole('button', { name: '目录树', exact: true }).click()
  const tree = page.getByRole('tree', { name: '工作区目录树' })
  await expect(tree).toBeVisible()
  const item = tree.getByRole('treeitem').filter({ hasText: 'module.ts' })
  await item.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/eslint\/files$/)
  await expect(page.getByLabel('当前定位文件', { exact: true })).toHaveText('module.ts')
  await page.getByRole('button', { name: '使用此文件实验', exact: false }).click()
  await expect(page).toHaveURL(/eslint\/experiment$/)
  await expect(page.getByRole('combobox', { name: '编辑文件', exact: true })).toHaveAttribute('data-value', 'module.ts')
  await page.getByRole('link', { name: '文件匹配', exact: true }).click()
  await page.getByRole('button', { name: '文件列表', exact: true }).click()
  await expect(page.locator('.file-list')).toBeVisible()
})

test('恢复确认支持取消和确认、Toast 复制反馈、沙箱确认焦点返回', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/experiment')
  const language = page.getByRole('switch', { name: 'Vue 语言集成', exact: true })
  await language.uncheck()
  await page.getByRole('button', { name: '恢复基础配置', exact: true }).click()
  await expect(page.getByRole('alertdialog')).toContainText('恢复默认配置')
  await page.keyboard.press('Escape')
  await expect(language).not.toBeChecked()
  await page.getByRole('button', { name: '恢复基础配置', exact: true }).click()
  await page.getByRole('button', { name: '确认恢复', exact: true }).click()
  await expect(language).toBeChecked()
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  for (let index = 0; index < 2; index++) {
    await page.getByRole('button', { name: '复制源码', exact: true }).click()
    await expect(page.locator('.ui-toast')).toContainText('已复制')
    await page.getByRole('button', { name: '关闭通知' }).click()
    await expect(page.locator('.ui-toast')).toHaveCount(0)
  }
  const reset = page.getByRole('button', { name: '重置沙箱', exact: true })
  await reset.click()
  await expect(page.getByRole('alertdialog')).toContainText('重新安装')
  await page.getByRole('button', { name: '取消重装' }).click()
  await expect(reset).toBeFocused()
})

test('接入步骤是可键盘操作的非线性阅读导航', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/stylelint/setup')
  const step = page.getByRole('button', { name: '运行与修复', exact: true })
  await step.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#verify')).toBeInViewport()
  await expect(page.locator('#install')).toBeAttached()
  await expect(page.locator('#save')).toBeAttached()
})

test('准备时显示不确定进度，失败后保留错误并结束等待状态', async ({ page }) => {
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/runtime/*.json', async (route) => {
    await held
    await route.fulfill({ status: 503 })
  })
  await page.goto('/#/eslint/experiment')
  const progress = page.getByRole('progressbar', { name: '当前工具正在准备或执行' })
  await expect(progress).toBeVisible()
  await expect(progress).not.toHaveAttribute('aria-valuenow')
  release()
  // 服务资源请求与 WebContainer 启动并行；准备结果需等启动 Promise 结束。
  await expect(page.locator('.preparation.error')).toBeVisible({ timeout: 45000 })
  await expect(progress).toHaveCount(0)
  await expect(page.locator('.runtime-state')).not.toHaveClass(/ready/)
})
