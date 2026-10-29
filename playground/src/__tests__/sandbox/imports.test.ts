/** 通过真实 Node ESM/CJS 互操作验证运行资源导入，避免只检查替换后的字符串。 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { expect, it } from 'vitest'
import { rewriteESLintImports } from '../../../scripts/bundle'

it.each([
  ['默认与具名导入', 'import factory, { GLOB_SRC, GLOB_VUE } from \'@antfu/eslint-config\'', 'factory(), GLOB_SRC, GLOB_VUE'],
  ['跨行与别名', 'import factory, {\n GLOB_SRC as source, GLOB_VUE as vue,\n} from \'@antfu/eslint-config\'', 'factory(), source, vue'],
  ['命名空间', 'import factory, * as upstream from \'@antfu/eslint-config\'', 'factory(), upstream.GLOB_SRC, upstream.GLOB_VUE'],
  ['仅默认导入', 'import factory from \'@antfu/eslint-config\'', 'factory()'],
  ['仅具名导入', 'import { GLOB_SRC as source } from \'@antfu/eslint-config\'', 'source'],
])('%s 保留预编译模块的实际导出', (_name, declaration, expression) => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../.tmp/runtime-imports')
  mkdirSync(root, { recursive: true })
  const directory = mkdtempSync(join(root, 'consumer-'))
  const dependency = join(directory, 'node_modules/@antfu/eslint-config')
  mkdirSync(dependency, { recursive: true })
  writeFileSync(join(dependency, 'package.json'), JSON.stringify({ name: '@antfu/eslint-config', type: 'module', exports: './index.mjs' }))
  writeFileSync(join(dependency, 'index.mjs'), 'throw new Error(\'不应加载原始 ESM 入口\')')
  writeFileSync(join(dependency, 'playground.cjs'), 'module.exports = { default: () => \'factory\', GLOB_SRC: \'source\', GLOB_VUE: \'vue\' }')
  const source = `${declaration}\nexport const result = [${expression}]\n`
  const filename = join(directory, 'config.mjs')
  writeFileSync(filename, rewriteESLintImports(source))
  const output = execFileSync(process.execPath, ['--input-type=module', '-e', `const { result } = await import(${JSON.stringify(pathToFileURL(filename).href)}); console.log(JSON.stringify(result))`], { encoding: 'utf8' })
  const expected = expression === 'factory()'
    ? ['factory']
    : expression === 'source'
      ? ['source']
      : ['factory', 'source', 'vue']
  expect(JSON.parse(output)).toEqual(expected)
})

it('缺少上游导入时明确失败', () => {
  expect(() => rewriteESLintImports('export const value = 1')).toThrow('未找到上游导入')
})
