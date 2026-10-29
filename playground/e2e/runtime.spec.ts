import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('按工具准备依赖，首次访问隔离，返回与重启复用服务', async ({ page }) => {
  test.setTimeout(900000)
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/runtime/'))
      resources.push(new URL(request.url()).pathname.split('/').pop()!)
  })
  await page.goto('/#/markdownlint/overview')
  await page.getByRole('link', { name: 'Markdownlint', exact: true }).click()
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  for (const [name, file] of [
    ['Markdownlint', 'markdownlint.json'],
    ['Stylelint', 'stylelint.json'],
    ['ESLint', 'eslint.json'],
  ]) {
    const start = Date.now()
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
    await attachMetrics('TOOL_PREPARATION', [name, Date.now() - start, resources])
    const mode = file.replace('.json', '')
    const timings = await page.evaluate(mode => Object.fromEntries([
      'restore',
      'install',
      'startup',
      'total',
    ].map(phase => [phase, performance.getEntriesByName(`playground:${mode}:${phase}`).at(-1)?.duration])), mode)
    await test.info().attach(`prepare-${mode}.json`, {
      body: JSON.stringify(timings, null, 2),
      contentType: 'application/json',
    })
    expect(resources).toContain(file)

    for (const action of ['检查代码', '预览修复']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: '应用修复到源码' })).toBeVisible()
    await page.getByRole('button', { name: '应用修复到源码' }).click()
  }
  const before = [...resources]
  const start = Date.now()
  await page.getByRole('link', { name: 'Markdownlint', exact: true }).click()
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  expect(resources).toEqual(before)
  await attachMetrics('CACHED_TOOL_CHECK_MS', [Date.now() - start])
  await page.getByRole('button', { name: '重启沙箱', exact: true }).click()
  await expect(page.getByRole('button', { name: '重启沙箱', exact: true })).toBeEnabled({ timeout: 30000 })
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
  expect(resources).toEqual(before)
  await page.screenshot({ path: '../.tmp/playground/validation/refinement/tools-ready.png', fullPage: true })
})

test('全新会话先准备 ESLint，再后台准备其他工具', async ({ page }) => {
  test.setTimeout(480000)
  const resources: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/runtime/'))
      resources.push(new URL(request.url()).pathname.split('/').pop()!)
  })
  const start = Date.now()
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
  expect(resources[0]).toBe('eslint.json')
  await attachMetrics('ISOLATED_ESLINT_PREPARATION_MS', [Date.now() - start])
  const checks: number[] = []
  for (let index = 0; index < 3; index++) {
    const check = Date.now()
    await page.getByRole('button', { name: '检查代码', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
    await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    checks.push(Date.now() - check)
  }
  expect(resources).toEqual(['eslint.json'])
  await attachMetrics('ISOLATED_ESLINT_CHECKS_MS', [checks])
})

test('三个工具独立 pnpm 存储，后台连续准备后均可检查与修复', async ({ page }) => {
  test.setTimeout(900000)
  await page.goto('/#/eslint/experiment')
  await expect.poll(async () => page.evaluate(() => ['eslint', 'stylelint', 'markdownlint'].filter(mode => performance.getEntriesByName(`playground:${mode}:startup`).length).length), { timeout: 840000 }).toBe(3)
  for (const name of ['ESLint', 'Stylelint', 'Markdownlint']) {
    await page.getByRole('link', { name, exact: true }).click()
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
    for (const action of ['检查代码', '预览修复']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 60000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
      await expect(page.locator('.result-summary')).toBeVisible()
    }
  }
  await attachMetrics('BACKGROUND_TOOL_MEASURES', [await page.evaluate(() => performance.getEntriesByType('measure').map(item => ({ name: item.name, duration: item.duration })))])
  // 当前停留 Markdownlint；重装须重新安装，重启则不得重复安装。
  const before = await page.evaluate(() => performance.getEntriesByName('playground:markdownlint:install').length)
  await page.getByRole('button', { name: '重置沙箱', exact: true }).click()
  await page.getByRole('button', { name: '确认重装', exact: true }).click()
  await expect.poll(async () => page.evaluate(() => performance.getEntriesByName('playground:markdownlint:install').length), { timeout: 180000 }).toBe(before + 1)
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 60000 })
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 60000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
  await page.getByRole('button', { name: '重启沙箱', exact: true }).click()
  await expect(page.getByRole('button', { name: '重启沙箱', exact: true })).toBeEnabled({ timeout: 60000 })
  expect(await page.evaluate(() => performance.getEntriesByName('playground:markdownlint:install').length)).toBe(before + 1)
})
