import { expect, test } from '@playwright/test'

test('沙箱状态详情与顶部使用同一阶段，明暗主题均区分准备、未初始化和失败', async ({ page }) => {
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/runtime/*.json', async (route) => {
    await held
    await route.fulfill({ status: 503 })
  })
  await page.goto('/#/eslint/experiment')
  const active = page.locator('.runtime-state')
  await expect(active).toHaveAttribute('data-phase', 'preparing')
  for (const dark of [false, true]) {
    if (dark)
      await page.getByRole('button', { name: '切换深色', exact: true }).click()
    await page.getByRole('button', { name: /三个工具准备状态/ }).click()
    const panel = page.locator('.sandbox-status-panel')
    const idle = panel.locator('[data-phase="idle"]')
    const preparing = panel.locator('[data-phase="preparing"]')
    await expect(idle).toHaveCount(2)
    await expect(preparing).toHaveCount(1)
    expect(await preparing.evaluate(element => getComputedStyle(element).color)).toBe(await active.evaluate(element => getComputedStyle(element).color))
    expect(await preparing.evaluate(element => getComputedStyle(element).color)).not.toBe(await idle.first().evaluate(element => getComputedStyle(element).color))
    await expect(preparing.locator('.i-lucide-loader-circle')).toBeVisible()
    await page.keyboard.press('Escape')
  }
  const preparingColor = await active.evaluate(element => getComputedStyle(element).color)
  release()
  await expect(active).toHaveAttribute('data-phase', 'error', { timeout: 45000 })
  expect(await active.evaluate(element => getComputedStyle(element).color)).not.toBe(preparingColor)
  await page.getByRole('button', { name: /三个工具准备状态/ }).click()
  await expect(page.locator('.sandbox-status-panel [data-phase="error"] .i-lucide-circle-x')).toBeVisible()
  await page.keyboard.press('Escape')
})

test('配置卡片使用折叠控件，规则操作菜单可键盘操作并返回焦点', async ({ page }) => {
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/overview')
  const card = page.locator('.configuration').filter({ hasText: 'antfu/javascript/rules' }).first()
  const trigger = card.locator('.disclosure-trigger')
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  await expect(card.locator('.config-body')).toBeVisible()
  const menu = card.locator('.rule-name').first()
  await menu.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: '复制名称', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  await expect(card.locator('.counts > span').first()).toContainText('文件条件')
  await expect(card.locator('.counts .i-lucide-file-search')).toBeVisible()
  await trigger.click()
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(card.locator('.config-body')).toBeHidden()
  await page.getByRole('link', { name: '统计与性能', exact: true }).click()
  const distribution = page.getByRole('button', { name: /规则分布/ })
  await distribution.click()
  await expect(distribution).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('.distribution-grid')).toBeVisible()
})
