/** 用 Node 与 TypeScript 的真实解析器验证对外文档代码，防止 JS 示例混入 TS 或 JSON 语法错误。 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

const root = fileURLToPath(new URL('../src/', import.meta.url))
const examples = readdirSync(root, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
  .flatMap((entry) => {
    const path = `${entry.parentPath}/${entry.name}`
    const source = readFileSync(path, 'utf8')
    return [
      ...source.matchAll(/^```(jsonc|json|js)([^\n]*)\n([\s\S]*?)^```/gm),
    ]
      .map((match, index) => ({
        path,
        index: index + 1,
        language: match[1]!,
        code: match[3]!,
      }))
  })

it.each(examples)('$path 示例 $index ($language) 语法有效', ({ path, language, code }) => {
  if (language === 'js') {
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: code, encoding: 'utf8' })
    expect(result.status, `${path}: ${result.stderr}`).toBe(0)
    return
  }
  if (language === 'json') {
    expect(() => JSON.parse(code)).not.toThrow()
    return
  }
  const { error } = ts.parseConfigFileTextToJson('example.jsonc', code)
  // TS 配置解析器要求顶层对象（5092）；文档中的忽略列表允许使用合法的 JSONC 顶层数组。
  if (error?.code === 5092)
    return
  expect(error).toBeUndefined()
})
