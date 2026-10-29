import { expect, test } from '@playwright/test'
import { attachMetrics } from './helpers'

test('折叠配置延迟挂载详情，单项和全部展开仍展示完整规则', async ({ page }) => {
  await page.goto('/#/eslint/overview')
  await expect(page.locator('.configuration').first()).toBeVisible()
  await attachMetrics('OVERVIEW_INITIAL_DOM', [await page.locator('*').count(), 'DETAILS', await page.locator('.config-body:visible').count()])
  await expect(page.locator('.config-body:visible')).toHaveCount(0)
  const javascript = page.locator('.configuration').filter({ hasText: 'antfu/javascript/rules' }).first()
  await javascript.locator('.disclosure-trigger').click()
  await expect(javascript.locator('.config-body:visible')).toBeVisible()
  await expect(javascript.locator('.rule-declarations code').first()).toBeVisible()
  await expect(page.locator('.config-body:visible')).toHaveCount(1)
  await page.getByRole('button', { name: '全部展开', exact: true }).click()
  await expect(page.locator('.config-body:visible')).toHaveCount(await page.locator('.configuration').count())
  await page.getByRole('button', { name: '全部收起', exact: true }).click()
  await expect(page.locator('.config-body:visible')).toHaveCount(0)
})
