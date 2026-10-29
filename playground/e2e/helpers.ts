import type { Locator, Page } from '@playwright/test'
import { test } from '@playwright/test'

/** 通过真实触发器与选项操作可访问选择控件，不依赖隐藏的表单同步节点。 */
export async function chooseOption(page: Page, trigger: Locator, value: string) {
  await trigger.click()
  await page.locator(`[role="option"][data-value=${JSON.stringify(value)}]`).click()
}

/** Monaco 使用原生 EditContext，通过键盘输入替换文本，而非填充隐藏输入节点。 */
export async function replaceEditor(page: Page, editor: Locator, source: string) {
  // 文本层随水平滚动移动；从固定视口聚焦，避免点击移出可视区的文本层。
  const surface = editor.locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " monaco-editor ")][1]')
  await surface.click({
    position: { x: 80, y: 12 },
    timeout: 5000,
  })
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText(source)
}

/** 将引擎耗时和界面测量写入测试报告，失败时也能下载查看。 */
export async function attachMetrics(name: string, values: unknown[]) {
  await test.info().attach(`${name}.json`, {
    body: JSON.stringify(values, null, 2),
    contentType: 'application/json',
  })
}
