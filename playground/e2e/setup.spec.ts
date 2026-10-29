import { expect, test } from '@playwright/test'

test('三工具接入脚本与下载文件一致，沙箱缓存独立清理', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  // 接入与缓存 UI 不需要联网安装引擎。
  await page.route('**/runtime/*.json', route => route.fulfill({ status: 503 }))
  await page.goto('/#/eslint/setup')
  for (const [mode, label, filename] of [
    ['eslint', 'ESLint', 'eslint.config.js'],
    ['stylelint', 'Stylelint', 'stylelint.config.js'],
    ['markdownlint', 'Markdownlint', 'markdownlint-cli2.mjs'],
  ]) {
    await page.getByRole('link', { name: label, exact: true }).click()
    await expect(page.locator('#save h3')).toHaveText(`02 保存为 ${filename}`)
    if (mode !== 'markdownlint')
      await expect(page.locator('#save')).toContainText('\"type\": \"module\"')
    const scripts = JSON.parse((await page.locator('#scripts pre').textContent())!).scripts
    expect(Object.keys(scripts)).toEqual([`lint:${mode}`, `format:${mode}`])
    expect(scripts[`format:${mode}`]).toBe(`pnpm run lint:${mode} --fix`)
    if (mode !== 'eslint')
      expect(scripts[`lint:${mode}`]).toContain(`--config ${filename}`)
    await expect(page.locator('#verify pre')).toContainText(`pnpm run format:${mode}`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: '下载配置', exact: true }).click()
    expect((await download).suggestedFilename()).toBe(filename)
  }
  await page.evaluate(async () => {
    const cache = await caches.open('playground-tool-filesystems-v1')
    for (const mode of ['eslint', 'stylelint', 'markdownlint'])
      await cache.put(new URL(`/runtime/cache/${mode}-test`, location.href), new Response('沙箱测试缓存'))
    await (await caches.open('unrelated-test')).put(new URL('/other', location.href), new Response('其他缓存'))
  })
  await page.getByRole('button', { name: '清理沙箱', exact: true }).click()
  await expect(page.locator('.ui-toast').filter({ hasText: '已清理 3 个沙箱缓存' })).toBeVisible()
  expect(await page.evaluate(async () => (await (await caches.open('playground-tool-filesystems-v1')).keys()).length)).toBe(0)
  expect(await page.evaluate(async () => (await (await caches.open('unrelated-test')).keys()).length)).toBe(1)
  await page.getByRole('button', { name: '清理沙箱', exact: true }).click()
  await expect(page.locator('.ui-toast').filter({ hasText: '没有可清理' })).toBeVisible()
  await page.getByRole('link', { name: '代码实验', exact: true }).click()
  await page.getByRole('button', { name: '复制日志', exact: true }).click()
  await expect(page.locator('.ui-toast').filter({ hasText: '已复制' })).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('准备检查环境')
  expect(copied).toContain('已清理 3 个沙箱缓存')
  await page.getByRole('button', { name: '清空日志', exact: true }).click()
  await expect(page.getByRole('button', { name: '复制日志', exact: true })).toBeDisabled()
  await expect(page.locator('.ui-toast').filter({ hasText: '已复制' })).toBeVisible()
})
