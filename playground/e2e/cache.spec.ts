import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('三工具依赖二进制缓存，刷新后恢复并真实检查', async ({ page }) => {
  test.setTimeout(900000)
  for (const [name, mode] of [
    ['Markdownlint', 'markdownlint'],
    ['Stylelint', 'stylelint'],
    ['ESLint', 'eslint'],
  ]) {
    await page.goto(`/#/${mode}/overview`)
    await page.getByRole('link', { name, exact: true }).click()
    await page.getByRole('link', { name: '代码实验', exact: true }).click()
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 360000 })
    await expect.poll(async () => page.evaluate(async (mode) => {
      const cache = await caches.open('playground-tool-filesystems-v1')
      return (await cache.keys()).some(request => request.url.includes(`/${mode}-`))
    }, mode), { timeout: 90000 }).toBe(true)
    const start = Date.now()
    await page.reload()
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 45000 })
    const timings = await page.evaluate(mode => ({
      restore: performance.getEntriesByName(`playground:${mode}:restore`).at(-1)?.duration,
      startup: performance.getEntriesByName(`playground:${mode}:startup`).at(-1)?.duration,
      total: performance.getEntriesByName(`playground:${mode}:total`).at(-1)?.duration,
      installations: performance.getEntriesByName(`playground:${mode}:install`).length,
    }), mode)
    expect(timings.restore).toBeGreaterThan(0)
    expect(timings.installations).toBe(0)
    await test.info().attach(`restore-${mode}.json`, {
      body: JSON.stringify(timings, null, 2),
      contentType: 'application/json',
    })
    for (const action of ['检查代码', '预览修复']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 30000 })
      await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: '应用修复到源码' })).toBeVisible()
    await attachMetrics('RESTORED_TOOL_CHECK_FIX_MS', [name, Date.now() - start])
    await page.screenshot({ path: `../.tmp/playground/validation/refinement/cache-${mode}.png`, fullPage: true })
  }
})
