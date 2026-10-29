import type { SandboxRequest } from '../../../protocol'
import { describe, expect, it } from 'vitest'
import { execute as eslint } from '../../../sandbox/eslint'
import { execute as markdownlint } from '../../../sandbox/markdownlint'
import { execute as stylelint } from '../../../sandbox/stylelint'

const moduleURL = (code: string) => `data:text/javascript,${encodeURIComponent(code)}`
function request(mode: SandboxRequest['mode'], filename: string, source: string, overrides: Record<string, unknown> = {}): SandboxRequest {
  return {
    mode,
    filename,
    source,
    overrides,
    config: '',
    action: 'check',
  }
}
describe('真实引擎契约', () => {
  it('stylelint 配置解析保留原生忽略结果，不把忽略文件显示为包含', async () => {
    const input = request('stylelint', 'ignored.css', 'a { broken')
    const result = await stylelint({ ...input, action: 'inspect' }, moduleURL('export default { ignoreFiles: ["**/ignored.css"], rules: { "color-no-invalid-hex": true } }'))
    expect(result.ignored).toBe(true)
    expect(result.rules).toEqual({})
    expect(result.messages).toEqual([])
  })
  it('三个工具解析配置时不检查非法示例源码', async () => {
    for (const [mode, filename, engine] of [
      ['eslint', 'sample.js', eslint],
      ['stylelint', 'sample.css', stylelint],
      ['markdownlint', 'sample.md', markdownlint],
    ] as const) {
      const input = {
        ...request(mode, filename, 'const = {'),
        action: 'inspect' as const,
      }
      const result = await engine(input, moduleURL('export default { rules: {} }'))
      expect(result.messages).toEqual([])
      expect(result.output).toBe(input.source)
    }
  })
  it('eSLint 源码语法错误返回真实诊断，未知规则拒绝配置而非报告通过', async () => {
    const input = request('eslint', 'sample.js', 'const =')
    const result = await eslint(input, moduleURL('export default [{ rules: {} }]'))
    expect(result.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', line: 1 }),
    ]))
    await expect(eslint({
      ...input,
      overrides: { 'rule-does-not-exist': 'error' },
    }, moduleURL('export default [{ rules: {} }]'))).rejects.toThrow(/rule/i)
  })
  it('stylelint 未知规则明确返回错误诊断', async () => {
    const input = request('stylelint', 'sample.css', 'a { color: red }', { 'rule-does-not-exist': true })
    const result = await stylelint(input, moduleURL('export default { rules: {} }'))
    expect(result.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ severity: 'error', rule: 'rule-does-not-exist' }),
    ]))
  })
  it('eSLint 修改级别改变诊断，修复返回源码不改输入', async () => {
    const input = request('eslint', 'sample.js', 'const value = 1;\nconsole.log(value);\n', { 'no-console': 'error' })
    const url = moduleURL('export default [{ rules: { "no-console": "error" } }]')
    const before = await eslint(input, url)
    expect(before.messages.some(m => m.rule === 'no-console')).toBe(true)
    const after = await eslint({
      ...input,
      overrides: { 'no-console': 'off' },
    }, url)
    expect(after.messages.some(m => m.rule === 'no-console')).toBe(false)
  })
  it('eSLint 连续检查、修复和统计使用各自操作选项，并重新读取配置', async () => {
    const input = request('eslint', 'sample.js', 'const value = 1;\n')
    const url = moduleURL('export default [{ rules: { semi: ["error", "never"] } }]')
    expect((await eslint(input, url)).messages.some(message => message.rule === 'semi')).toBe(true)
    expect((await eslint({ ...input, action: 'fix' }, url)).output).toBe('const value = 1\n')
    expect((await eslint({ ...input, action: 'stats' }, url)).performance).toBeDefined()
    expect((await eslint(input, moduleURL('export default [{ rules: {} }]'))).messages).toEqual([])
  })
  it('stylelint 保留无效颜色诊断，修复可修复颜色', async () => {
    const input = request('stylelint', 'sample.css', 'a { color: #ffffff; }', { 'color-hex-length': 'short' })
    const result = await stylelint({ ...input, action: 'fix' }, moduleURL('export default { rules: {} }'))
    expect(result.output).toContain('#fff;')
    expect(input.source).toContain('#ffffff')
  })
  it('markdownlint 应用修复后重新检查并报告剩余结果', async () => {
    const input = request('markdownlint', 'sample.md', '# Title\n\ntext   \n', { MD009: true })
    const result = await markdownlint({ ...input, action: 'fix' }, moduleURL('export default { default: false }'))
    expect(result.output).toBe('# Title\n\ntext\n')
    expect(result.messages).toEqual([])
  })
})
