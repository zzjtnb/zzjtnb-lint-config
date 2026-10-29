import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compileFunction } from 'node:vm'

import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

import { zzjtnb } from '../src/index'

const documents = [
  'packages/stylelint/README.md',
  'packages/stylelint/README.zh-CN.md',
  'docs/src/stylelint/configuration.md',
  'docs/src/stylelint/index.md',
  'docs/src/quick-start.md',
  'docs/src/engineering/debugging.md',
]

// 只执行受版本管理的工厂示例，输入不是用户草稿或外部下载的文档。
const examples = documents.flatMap((file) => {
  const source = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8')
  return [
    ...source.matchAll(/```js(?: \[[^\n]+\])?\n([\s\S]*?)\n```/g),
  ]
    .filter(([, code]) => code!.includes('export default zzjtnb(') && code!.includes('from \'@zzjtnb/stylelint-config\''))
    .map(([, code], index) => ({ file, index: index + 1, code: code! }))
})

describe('stylelint 文档的可复制配置', () => {
  it('各文档都有实际执行的工厂示例', () => {
    expect(new Set(examples.map(example => example.file))).toEqual(new Set(documents))
  })

  it.each(examples)('$file 示例 $index 能直接用于真实 Stylelint', async ({ file, code }) => {
    // 示例使用单行具名导入；移除导入并将默认导出作为函数返回值，注入当前源码工厂。
    const source = code.replace(/^import[^\n]*$/gm, '').replace('export default', 'return')
    const config = compileFunction(source, ['zzjtnb'], {
      filename: fileURLToPath(new URL(`../../../${file}`, import.meta.url)),
    })(zzjtnb)
    const result = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: 'consumer.css',
      config,
      fix: true,
    })
    expect(result.results[0]?.invalidOptionWarnings).toEqual([])
    expect(result.results[0]?.parseErrors).toEqual([])
    expect(result.results[0]?.warnings).toEqual([])
  })
})
