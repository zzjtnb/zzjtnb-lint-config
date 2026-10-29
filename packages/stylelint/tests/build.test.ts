/** 验证本包构建入口与类型检查范围。 */
import { execFileSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import manifest from '../package.json' with { type: 'json' }
import build from '../tsdown.config'

it('构建产物保留公开入口和外部依赖', () => {
  expect(build.deps?.neverBundle).toBe(true)
  expect(build.dts).toMatchObject({ generator: 'tsgo' })
  expect(build.exports).toBe(true)
  expect(manifest.exports['.']).toBe('./dist/index.mjs')
})
it('类型检查包含源码、测试与构建配置', () => {
  const directory = fileURLToPath(new URL('..', import.meta.url))
  const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
  // 使用模板实际安装的编译器解析 include，不引入另一版 TypeScript API。
  const config = JSON.parse(execFileSync(process.execPath, [
    compiler,
    '--showConfig',
    '-p',
    directory,
  ], { encoding: 'utf8' }))
  expect(config.files).toContain('./src/index.ts')
  expect(config.files).toContain('./tsdown.config.ts')
  expect(manifest.scripts.typecheck).toContain('--noEmit')
})
