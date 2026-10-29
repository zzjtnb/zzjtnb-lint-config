/** CLI2 升级时对照实际引擎的官方声明，阻止本地适配静默过时。 */
import { findPackageJSON } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyFixes, getVersion } from 'markdownlint-cli2/markdownlint'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'
import parse from 'markdownlint-cli2/parsers/jsonc'
import ts from 'typescript'
import { expect, it } from 'vitest'

const options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.NodeNext,
  moduleResolution: ts.ModuleResolutionKind.NodeNext,
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  types: [],
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

it('cLI2 发布正式类型后提醒移除本地声明适配', () => {
  for (const name of ['markdownlint-cli2/markdownlint', 'markdownlint-cli2/markdownlint/promise', 'markdownlint-cli2/parsers/jsonc']) {
    const result = ts.resolveModuleName(name, resolve(root, 'contract.ts'), options, ts.sys).resolvedModule
    expect(result, name).toBeDefined()
    expect(result!.resolvedFileName, `${name} 已有正式类型时应移除本地声明再验证`).not.toMatch(/\.d\.[cm]?ts$/)
  }
})

it('诊断字段与修复函数签名和 CLI2 实际引擎官方类型一致', () => {
  const manifest = findPackageJSON('markdownlint', import.meta.resolve('markdownlint-cli2/markdownlint'))!
  // 虚拟文件只存在于编译器内存中，借依赖目录解析官方类型，不写入 node_modules。
  const filename = resolve(dirname(manifest), 'playground-contract.ts')
  const source = `
    import * as Actual from 'markdownlint'
    import * as ActualPromise from 'markdownlint/promise'
    import * as Declared from 'markdownlint-cli2/markdownlint'
    import * as DeclaredPromise from 'markdownlint-cli2/markdownlint/promise'
    type Equal<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false
    const error: Equal<Actual.LintError, Declared.LintError> = true
    const fix: Equal<typeof Actual.applyFixes, typeof Declared.applyFixes> = true
    const version: Equal<typeof Actual.getVersion, typeof Declared.getVersion> = true
    const results: Equal<Awaited<ReturnType<typeof ActualPromise.lint>>[string], Awaited<ReturnType<typeof DeclaredPromise.lint>>[string]> = true
    export { error, fix, version, results }
  `
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (...args) => args[0] === filename
    ? ts.createSourceFile(filename, source, ts.ScriptTarget.ESNext, true)
    : original(...args)
  const program = ts.createProgram([
    resolve(root, 'scripts/lib/markdownlint-cli2.d.ts'),
    filename,
  ], options, host)
  expect(ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([])
})

it('通过 CLI2 正式入口读取 JSONC、返回完整诊断并执行自动修复', async () => {
  expect(getVersion()).toMatch(/^\d+\./)
  const config = parse('{ /* JSONC */ "default": false, "MD009": true, }')
  const source = '# Title\n\nText   \n'
  const results = await lint({
    strings: { 'example.md': source },
    config,
  })
  expect(results['example.md']).toHaveLength(1)
  expect(results['example.md']![0]).toMatchObject({
    lineNumber: 3,
    ruleNames: expect.arrayContaining(['MD009']),
    severity: 'error',
    fixInfo: { deleteCount: 3 },
  })
  expect(applyFixes(source, results['example.md']!)).toBe('# Title\n\nText\n')
  const shared = await readConfig(resolve(root, '../packages/markdownlint/index.jsonc'), [parse])
  expect(shared).toMatchObject({ MD013: false })
})
