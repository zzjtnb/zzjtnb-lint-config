/** 验证生产资源优化后仍能绘图、高亮和加载原始 WASM，且按页面延迟下载。 */
import { expect, test } from '@playwright/test'

test('饼图不请求柱状图，编辑器按需加载二进制并保留语法高亮', async ({ page }) => {
  const assets: string[] = []
  page.on('request', (request) => {
    const url = new URL(request.url())
    if (url.pathname.includes('/assets/'))
      assets.push(url.pathname)
  })
  // 只验证资源与 UI；不让检查引擎联网安装影响编辑器加载证据。
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/overview')
  await expect(page.locator('.data-chart svg path').first()).toBeVisible()
  expect(assets.some(path => path.split('/').pop()!.startsWith('bar-'))).toBe(false)
  expect(assets.some(path => path.endsWith('.wasm'))).toBe(false)

  const wasm = page.waitForResponse(response => response.url().includes('editor-oniguruma-') && response.url().endsWith('.wasm'))
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  const response = await wasm
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('application/wasm')
  const source = page.locator('.source-panel .original .view-lines')
  await expect(source).toBeVisible({ timeout: 90000 })
  // 验证实际渲染的 token 颜色，避免把只显示纯文本当作编辑器高亮正常。
  await expect.poll(() => source.locator('.view-line span').evaluateAll(nodes => new Set(nodes.map(node => getComputedStyle(node).color)).size), { timeout: 90000 }).toBeGreaterThan(1)
  await expect(page.getByRole('alert').filter({ hasText: /编辑器加载失败|图表加载失败/ })).toHaveCount(0)
})
