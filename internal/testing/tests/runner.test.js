/** 各工作区独立发现自身测试，不依赖根 Vitest 配置。 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { cliPath } from '../helpers/cli.js'

for (const directory of [
  'packages/eslint',
  'packages/stylelint',
  'packages/markdownlint',
  'apps/demo',
  'docs',
  'playground',
]) {
  it(`${directory} 独立发现自己的测试`, { timeout: 30000 }, () => {
    const cwd = fileURLToPath(new URL(`../../../${directory}/`, import.meta.url))
    const output = execFileSync(process.execPath, [
      cliPath('vitest', 'vitest', new URL(`../../../${directory}/package.json`, import.meta.url)),
      'list',
      '--filesOnly',
      '--json',
    ], { cwd, encoding: 'utf8' })
    const files = JSON.parse(output)
    assert.ok(files.length > 0)
    assert.ok(files.every(item => item.file.startsWith(cwd)))
  })
}
