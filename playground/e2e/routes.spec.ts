import { expect, test } from '@playwright/test'

test('工具深链接、刷新、历史和工作区跳转保留路由工具，首次只请求对应资源', async ({ page }) => {
  // 隔离网络安装，不把路由验收冒充真实引擎验收。
  const resources: string[] = []
  await page.route('**/runtime/*.json', async (route) => {
    resources.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 503, body: '路由测试不安装依赖' })
  })
  const metadata: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/metadata/'))
      metadata.push(new URL(request.url()).pathname)
  })
  await page.goto('/#/stylelint/experiment')
  await expect(page.getByRole('link', { name: 'Stylelint', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => resources.length).toBe(1)
  expect(resources[0]).toContain('/stylelint.json')
  expect(metadata.length).toBeGreaterThan(0)
  expect(metadata.every(path => path.includes('/stylelint/'))).toBe(true)
  await page.getByRole('link', { name: '规则目录', exact: true }).click()
  await expect(page).toHaveURL(/#\/stylelint\/rules$/)
  await page.getByRole('link', { name: 'Markdownlint', exact: true }).click()
  await expect(page).toHaveURL(/#\/markdownlint\/rules$/)
  await page.goBack()
  await expect(page).toHaveURL(/#\/stylelint\/rules$/)
  await expect(page.getByRole('link', { name: 'Stylelint', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.goForward()
  await expect(page.getByRole('link', { name: 'Markdownlint', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.reload()
  await expect(page).toHaveURL(/#\/markdownlint\/rules$/)
  await expect(page.getByRole('link', { name: 'Markdownlint', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('link', { name: 'ESLint', exact: true }).click()
  await expect(page).toHaveURL(/#\/eslint\/rules$/)
  await page.goto('/#/rules?rule=no-console')
  await expect(page).toHaveURL(/#\/eslint\/rules\?rule=no-console$/)
})
