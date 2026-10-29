/** 验证本包构建入口与类型检查范围。 */
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'
import manifest from '../package.json' with { type: 'json' }
import build from '../tsdown.config'

it('构建产物保留公开入口和外部依赖', () => {
  expect(build.deps?.neverBundle).toBe(true)
  expect(build.dts).toMatchObject({ generator: 'tsc' })
  expect(build.exports).toBe(true)
  expect(manifest.exports['.']).toBe('./dist/index.mjs')
})
it('类型检查包含源码、测试与构建配置', () => {
  const directory = fileURLToPath(new URL('..', import.meta.url))
  const source = ts.readConfigFile(resolve(directory, 'tsconfig.json'), ts.sys.readFile)
  expect(source.error).toBeUndefined()
  const config = ts.parseJsonConfigFileContent(source.config, ts.sys, directory)
  expect(config.errors).toEqual([])
  expect(config.fileNames).toContain(resolve(directory, 'src/index.ts'))
  expect(config.fileNames).toContain(resolve(directory, 'tsdown.config.ts'))
  expect(manifest.scripts.typecheck).toContain('--noEmit')
})
