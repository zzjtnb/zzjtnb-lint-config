import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('三工具工作区统计展示真实文件，细分耗时按引擎能力展示', async ({ page }) => {
  test.setTimeout(900000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#/markdownlint/stats')
  for (const [tool, count] of [
    ['Markdownlint', 1],
    ['Stylelint', 4],
    ['ESLint', 6],
  ] as const) {
    await page.getByRole('navigation', { name: '检查工具' }).getByRole('link', { name: tool, exact: true }).click()
    await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪', { timeout: 420000 })
    await page.getByRole('button', { name: '运行工作区性能分析', exact: true }).click()
    await expect(page.getByRole('button', { name: '运行工作区性能分析', exact: true })).toBeEnabled({ timeout: 60000 })
    await expect(page.locator('.stats-page .notice.error')).toHaveCount(0)
    await expect(page.locator('.performance-summary')).toContainText(`检查 ${count} 个文件`)
    await expect(page.getByLabel('执行耗时分布图').locator('svg')).toBeVisible()
    await page.getByRole('button', { name: '慢文件', exact: true }).click()
    await expect(page.locator('.ranking')).toHaveCount(count)
    await expect(page.getByLabel('当前维度耗时排行图').locator('svg')).toBeVisible()
    for (const dimension of ['慢规则', '慢插件', '慢任务']) {
      await page.getByRole('button', { name: dimension, exact: true }).click()
      if (tool === 'ESLint') {
        await expect(page.locator('.ranking').first()).toBeVisible()
      }
      else {
        await expect(page.locator('.ranking')).toHaveCount(0)
        await expect(page.getByText('当前执行没有提供此维度的性能数据。', { exact: false })).toBeVisible()
      }
    }
    if (tool === 'ESLint') {
      const search = page.getByRole('searchbox', { name: '筛选性能排行', exact: true })
      await search.fill('no-such-performance-item')
      await expect(page.locator('.ranking')).toHaveCount(0)
      await page.getByRole('button', { name: '清除排行搜索', exact: true }).click()
      await expect(page.locator('.ranking')).toHaveCount(30)
      await page.getByRole('button', { name: '再显示 30 项', exact: true }).click()
      await expect(page.locator('.ranking')).toHaveCount(60)
      await page.getByRole('button', { name: '慢规则', exact: true }).click()
      const ruleName = await page.locator('.ranking').first().locator('code').textContent()
      const chart = page.getByLabel('当前维度耗时排行图')
      const size = await chart.boundingBox()
      await chart.click({
        position: { x: size!.width * 0.6, y: 20 },
      })
      await expect(page.locator('.rule-detail h2')).toHaveText(ruleName!)
      await page.goBack()
    }
    await page.getByRole('button', { name: '慢文件', exact: true }).click()
    await page.locator('.ranking').first().click()
    await expect(page.getByRole('main', { name: '代码实验', exact: true })).toBeVisible()
    await page.getByRole('link', { name: '统计与性能', exact: true }).click()
    await expect(page.locator('.performance-summary')).toContainText(`检查 ${count} 个文件`)
    await attachMetrics('VERIFIED_WORKSPACE_STATS', [tool, count, await page.locator('.performance-summary').textContent()])
  }
})
