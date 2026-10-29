/** 使用真实磁盘文件验证源码导入后缀，区分合法 JS、TS 与编译产物映射。 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { beforeAll, expect, it } from 'vitest'
import { zzjtnb } from '../src/index'

let directory: string
let engine: ESLint
const rule = 'zzjtnb/import-extensions'

beforeAll(async () => {
  const parent = fileURLToPath(new URL('../../../.tmp/eslint-imports/', import.meta.url))
  await mkdir(parent, { recursive: true })
  directory = await mkdtemp(join(parent, 'consumer-'))
  for (const file of [
    'source.ts',
    'native.mjs',
    'esm.mts',
    'common.cts',
    'javascript.js',
    'pair.js',
    'pair.ts',
  ])
    await writeFile(join(directory, file), 'export const value = 1\n')
  engine = new ESLint({
    cwd: directory,
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      gitignore: false,
      defaultIgnores: false,
      vue: false,
      antislop: false,
    }),
  })
})

it.each([
  ['source.js', 'source.ts'],
  ['native.ts', 'native.mjs'],
  ['esm.mjs', 'esm.mts'],
  ['common.cjs', 'common.cts'],
])('不存在的 %s 不能代替真实源码 %s', async (imported, actual) => {
  const [result] = await engine.lintText(`export { value } from './${imported}'\n`, {
    filePath: join(directory, 'entry.ts'),
  })
  const errors = result!.messages.filter(message => message.ruleId === rule)
  expect(errors).toHaveLength(1)
  expect(errors[0]?.message).toContain(actual)
  expect(errors[0]?.fix).toBeUndefined()
})

it.each([
  'source',
  'source.ts',
  'native.mjs',
  'javascript.js',
  'pair.js',
  'source.ts?raw',
  'missing.js',
])('允许无后缀、真实文件和未能确定目标的路径：%s', async (imported) => {
  const [result] = await engine.lintText(`export { value } from './${imported}'\n`, {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toEqual([])
})

it.each([
  'import { value } from \'./source.js\'\nexport { value }\n',
  'export * from \'./source.js\'\n',
  'export const value = import(\'./source.js\')\n',
  'export const value = require(\'./source.js\')\n',
])('导入、转导出和动态加载遵守相同的真实后缀检查', async (source) => {
  const [result] = await engine.lintText(source, {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toHaveLength(1)
})

it('不将普通字符串、包名和虚拟模块当作相对文件检查', async () => {
  const [result] = await engine.lintText('import \'virtual:uno.css\'\nimport \'external/module.js\'\nexport const path = \'./source.js\'\n', {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toEqual([])
})

it('声明文件保留运行时模块契约，消费方可以覆盖本包默认规则', async () => {
  const [declaration] = await engine.lintText('export { value } from \'./source.js\'\n', {
    filePath: join(directory, 'entry.d.ts'),
  })
  expect(declaration!.messages.filter(message => message.ruleId === rule)).toEqual([])
  const consumer = new ESLint({
    cwd: directory,
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      gitignore: false,
      defaultIgnores: false,
      rules: { [rule]: 'off' },
    }),
  })
  const [result] = await consumer.lintText('export { value } from \'./source.js\'\n', {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toEqual([])
})

it('类型查询 import() 同样检查显式后缀', async () => {
  const [result] = await engine.lintText('export type Source = typeof import(\'./source.js\')\n', {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toHaveLength(1)
})

it('名为 require 的本地函数不是 CommonJS 模块加载器', async () => {
  const [result] = await engine.lintText('function require(path: string) { return path }\nexport const value = require(\'./source.js\')\n', {
    filePath: join(directory, 'entry.ts'),
  })
  expect(result!.messages.filter(message => message.ruleId === rule)).toEqual([])
})
