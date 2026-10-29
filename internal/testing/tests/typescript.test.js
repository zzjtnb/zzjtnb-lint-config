import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../../../', import.meta.url))
describe('typeScript CLI 与工具 API 共存', () => {
  it('消费示例的编译器入口提供 TS7', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../../apps/demo/node_modules/typescript/package.json', import.meta.url), 'utf8'))
    const cli = fileURLToPath(new URL(`../../../apps/demo/node_modules/typescript/${manifest.bin.tsc}`, import.meta.url))
    const version = execFileSync(process.execPath, [cli, '--version'], { cwd: root, encoding: 'utf8' })
    assert.match(manifest.version, /^7\./)
    assert.strictEqual(version.trim(), `Version ${manifest.version}`)
  })
  for (const directory of [
    'packages/eslint',
    'docs',
    'playground',
  ]) {
    it(`经典 API 消费方 ${directory} 自行解析兼容编译器 API`, () => {
      const require = createRequire(new URL(`../../../${directory}/package.json`, import.meta.url))
      const api = require('typescript')
      assert.match(api.version, /^6\./)
      const result = api.transpileModule('const value: number = 1', {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
        reportDiagnostics: true,
      })
      assert.deepStrictEqual(result.diagnostics, [])
      assert.ok((result.outputText).includes('const value = 1'))
    })
  }
})
for (const directory of ['packages/stylelint', 'packages/markdownlint']) {
  it(`${directory} 使用模板的正式 TS7，不额外声明 TS6 测试别名`, () => {
    const require = createRequire(new URL(`../../../${directory}/package.json`, import.meta.url))
    assert.match(require('typescript').version, /^7\./)
    const manifest = require('./package.json')
    assert.strictEqual(manifest.devDependencies.typescript, 'catalog:')
    assert.strictEqual(Object.hasOwn(manifest.devDependencies, 'typescript6'), false)
  })
}
for (const file of ['.vscode/settings.json', 'zzjtnb-lint-config.code-workspace']) {
  it(`编辑器入口 ${file} 指向有效的经典语言服务，不把 TS7 CLI 当 tsserver`, () => {
    const source = readFileSync(new URL(`../../../${file}`, import.meta.url), 'utf8')
    const settings = ts.parseConfigFileTextToJson('settings.json', source)
    assert.strictEqual(settings.error, undefined)
    const sdk = (settings.config.settings ?? settings.config)['js/ts.tsdk.path']
    assert.strictEqual(typeof sdk, 'string')
    const server = new URL(`../../../${sdk}/tsserver.js`, import.meta.url)
    assert.ok(readFileSync(server, 'utf8').length > 0)
  })
}
