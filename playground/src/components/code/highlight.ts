/** 只读片段共享轻量 Shiki 实例，仅打包 JSON、JavaScript 和两套主题。 */
import { createHighlighterCore } from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'
import javascript from 'shiki/langs/javascript.mjs'
import json from 'shiki/langs/json.mjs'
import dark from 'shiki/themes/github-dark.mjs'
import light from 'shiki/themes/github-light.mjs'

const highlighter = createHighlighterCore({
  themes: [light, dark],
  langs: [json, javascript],
  engine: createJavaScriptRegexEngine(),
})

/** 将代码转成已转义的高亮标记；主题通过 CSS 变量切换，不重新解析代码。 */
export async function highlight(code: string, language: 'json' | 'javascript') {
  return (await highlighter).codeToHtml(code, {
    lang: language,
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false,
  })
}
