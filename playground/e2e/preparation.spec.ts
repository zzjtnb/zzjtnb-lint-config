import { expect, test } from '@playwright/test'
import { replaceEditor } from './helpers'

test('取消资源下载后保留草稿，重新准备使用真实引擎检查', async ({ page }) => {
  test.setTimeout(480000)
  let first = true
  let release: (() => void) | undefined
  // 只暂停第一次资源请求，使取消场景确定可复现；重试直接读取真实服务资源。
  await page.route('**/runtime/markdownlint.json', async (route) => {
    if (!first)
      return route.continue()
    first = false
    await new Promise<void>((resolve) => {
      release = resolve
    })
    await route.abort()
  })
  await page.goto('/#/markdownlint/experiment')
  await expect.poll(() => !!release).toBe(true)
  const source = page.locator('.source-editor .monaco-diff-editor .editor.original .view-lines')
  await expect(source).toBeVisible({ timeout: 30000 })
  await replaceEditor(page, source, '# 保留输入\n\nText   \n')
  await page.getByRole('button', { name: '取消准备', exact: true }).click()
  await expect(page.locator('.runtime-state')).toContainText('准备已取消')
  await expect(source).toContainText('保留输入')
  release!()
  await page.getByRole('button', { name: '重新准备', exact: true }).click()
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 300000 })
  await expect(source).toContainText('保留输入')
  await page.getByRole('button', { name: '检查代码', exact: true }).click()
  await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 70000 })
  await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
})
