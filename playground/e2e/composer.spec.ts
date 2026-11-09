import { expect, test } from '@playwright/test'
import { chooseOption, replaceEditor } from './helpers'

test('Composer 配置在真实沙箱保留 Markdown 状态、链式覆盖、文件范围与 Vue 自动检测', async ({ page, context }) => {
  test.setTimeout(480000)
  await page.goto('/#/eslint/experiment')
  await expect(page.locator('.runtime-state')).toContainText(/浏览器引擎已就绪|引擎准备失败/, { timeout: 420000 })
  await expect(page.locator('.runtime-state')).toContainText('浏览器引擎已就绪')
  const source = page.locator('.source-panel .original .view-lines')
  await replaceEditor(page, source, 'console.log(\'composer\')\n')
  await page.getByRole('tab', { name: '配置源码', exact: true }).click()
  const config = page.locator('.source-config .view-lines')
  const configuration = `import { zzjtnb } from '@zzjtnb/eslint-config'
export default zzjtnb({ pnpm: false })
  .setDefaultIgnores(previous => {
    if (!previous.includes('**/*.md')) throw new Error('Markdown 默认忽略状态未传递')
    return previous
  })
  .prepend({ name: 'consumer/before', rules: { 'no-console': 'error' } })
  .override('antfu/javascript/rules', { rules: { 'no-console': 'off' } })
  .append({ name: 'consumer/typescript', files: ['**/*.ts'], rules: { 'no-console': 'error' } })`
  // 按真实粘贴输入完整模块，并通过公开复制入口核对完整模型内容。
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate(text => navigator.clipboard.writeText(text), configuration)
  await config.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " monaco-editor ")][1]').click({
    position: { x: 80, y: 12 },
  })
  const modifier = await page.evaluate(() => navigator.userAgent.includes('Macintosh')
    ? 'Meta'
    : 'Control')
  await page.keyboard.press(`${modifier}+A`)
  // 原生粘贴由宿主平台处理，不能沿用 Monaco 按 userAgent 选择的全选键。
  await page.keyboard.press('ControlOrMeta+V')
  await expect(config).toContainText('consumer/typescript')
  await page.getByRole('button', { name: '复制源码', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(configuration)
  const check = async () => {
    await page.getByRole('button', { name: '检查代码', exact: true }).click()
    await expect(page.getByRole('button', { name: '检查代码', exact: true })).toBeEnabled({ timeout: 60000 })
    await expect(page.locator('.diagnostics .notice.error')).toHaveCount(0)
    await expect(page.locator('.result-summary')).toBeVisible()
  }
  await check()
  await expect(page.locator('.diagnostics')).toContainText('no-console')
  const select = page.getByRole('combobox', { name: '编辑文件', exact: true })
  await chooseOption(page, select, 'module.js')
  await replaceEditor(page, source, 'console.log(\'composer\')\n')
  await check()
  await expect(page.locator('.diagnostics')).not.toContainText('no-console')
  await chooseOption(page, select, 'component.vue')
  await replaceEditor(page, source, '<template><img src="avatar.png"></template>\n')
  await check()
  await expect(page.locator('.diagnostics')).toContainText('vue-a11y/alt-text')
})
