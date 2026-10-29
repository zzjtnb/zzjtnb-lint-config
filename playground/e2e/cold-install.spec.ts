import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

for (const [name, mode] of [
  ['ESLint', 'eslint'],
  ['Stylelint', 'stylelint'],
  ['Markdownlint', 'markdownlint'],
]) {
  test(`无缓存固定锁文件安装 ${name}，记录安装与预热耗时`, async ({ page }) => {
    test.setTimeout(480000)
    await page.goto(`/#/${mode}/overview`)
    expect(await page.evaluate(async () => (await (await caches.open('playground-tool-filesystems-v1')).keys()).length)).toBe(0)
    await page.getByRole('link', { name, exact: true }).click()
    const start = Date.now()
    await page.getByRole('link', { name: '代码实验', exact: true }).click()
    await expect(page.locator('.runtime-state')).toContainText(/浏览器引擎已就绪|引擎准备失败/, { timeout: 420000 })
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
    const timings = await page.evaluate(mode => ({
      install: performance.getEntriesByName(`playground:${mode}:install`).at(-1)?.duration,
      startup: performance.getEntriesByName(`playground:${mode}:startup`).at(-1)?.duration,
      restore: performance.getEntriesByName(`playground:${mode}:restore`).at(-1)?.duration,
      total: performance.getEntriesByName(`playground:${mode}:total`).at(-1)?.duration,
    }), mode)
    expect(timings.install).toBeGreaterThan(0)
    expect(timings.startup).toBeGreaterThan(0)
    expect(timings.total).toBeGreaterThanOrEqual(timings.install! + timings.startup!)
    await test.info().attach(`prepare-${mode}.json`, {
      body: JSON.stringify(timings, null, 2),
      contentType: 'application/json',
    })
    await attachMetrics('FROZEN_COLD_INSTALL', [
      JSON.stringify({ mode, total: Date.now() - start, ...timings }),
    ])
    for (const action of ['检查代码', '预览修复']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 30000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: '应用修复到源码' })).toBeVisible()
    await page.screenshot({ path: `../.tmp/playground/validation/cold-install/${mode}.png`, fullPage: true })
  })
}
