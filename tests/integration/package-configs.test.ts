import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import eslintManifest from '../../packages/eslint-config/package.json' with { type: 'json' }
import eslintBuild from '../../packages/eslint-config/tsdown.config'
import stylelintManifest from '../../packages/stylelint-config/package.json' with { type: 'json' }
import stylelintBuild from '../../packages/stylelint-config/tsdown.config'

const root = fileURLToPath(new URL('../../', import.meta.url))

describe.each([
  ['eslint-config', eslintBuild, eslintManifest],
  ['stylelint-config', stylelintBuild, stylelintManifest],
] as const)('公开配置包：%s', (name, build, manifest) => {
  it('打包配置显式匹配公开入口，并将运行时依赖保留在外部', () => {
    expect(build.entry).toEqual(['src/index.ts'])
    expect(build.format).toEqual(['esm'])
    expect(build.deps?.neverBundle).toBe(true)
    expect(build.dts).toMatchObject({ resolver: 'tsc' })
    const extensions = build.outExtensions!({ format: 'es', pkgType: 'module', options: {} })
    expect(extensions).toEqual({ js: '.mjs', dts: '.d.ts' })
    expect(manifest.exports['.'].import).toBe('./dist/index.mjs')
    expect(manifest.exports['.'].types).toBe('./dist/index.d.ts')
  })

  it('类型检查包含构建配置，并且不向 dist 写入另一套产物', () => {
    const directory = resolve(root, 'packages', name)
    const source = ts.readConfigFile(resolve(directory, 'tsconfig.json'), ts.sys.readFile)
    expect(source.error).toBeUndefined()
    const config = ts.parseJsonConfigFileContent(source.config, ts.sys, directory)
    expect(config.errors).toEqual([])
    expect(config.options.noEmit).toBe(true)
    expect(config.fileNames).toContain(resolve(directory, 'src/index.ts'))
    expect(config.fileNames).toContain(resolve(directory, 'tsdown.config.ts'))
  })
})
