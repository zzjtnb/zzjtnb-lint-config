import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

import * as eslintConfigModule from '@zzjtnb/eslint-config'
import { zzjtnb } from '@zzjtnb/eslint-config'
import * as stylelintConfigModule from '@zzjtnb/stylelint-config'
import stylelintConfig, { zzjtnb as createStylelintConfig } from '@zzjtnb/stylelint-config'
import { ESLint } from 'eslint'
import { readConfig } from 'markdownlint-cli2/markdownlint/promise'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

const stylelintTypeFixture = fileURLToPath(new URL('../fixtures/stylelint/consumer-types.ts', import.meta.url))
const eslintTypeFixture = fileURLToPath(new URL('../fixtures/eslint/consumer-types.ts', import.meta.url))

// 不读取仓库源码 paths。负向用例只在编译器内存中提供输入，直接断言诊断，不使用类型禁用注释。
function createConsumerTypeProgram(fixture: string, source?: string) {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  }
  const host = ts.createCompilerHost(options)
  if (source !== undefined) {
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (...args) => args[0] === fixture
      ? ts.createSourceFile(fixture, source, ts.ScriptTarget.ESNext, true)
      : getSourceFile(...args)
  }
  return ts.createProgram([fixture], options, host)
}

describe('公开包入口与配置契约', () => {
  let eslintFlatConfig: Awaited<ReturnType<typeof zzjtnb>>

  beforeAll(async () => {
    const result = zzjtnb({ unocss: false, vue: false })
    expect(result).toBeInstanceOf(Promise)
    eslintFlatConfig = await result
  }, 30_000)

  it('通过包名加载 ESLint 和 Stylelint 构建产物及公开导出', () => {
    expect(import.meta.resolve('@zzjtnb/eslint-config')).toBe(new URL('../../packages/eslint-config/dist/index.mjs', import.meta.url).href)
    expect(import.meta.resolve('@zzjtnb/stylelint-config')).toBe(new URL('../../packages/stylelint-config/dist/index.mjs', import.meta.url).href)
    expect(Object.keys(eslintConfigModule)).toEqual(['zzjtnb'])
    expect(Object.keys(stylelintConfigModule)).toEqual(['default', 'zzjtnb'])
  })

  it('消费方从正式包名获得 Stylelint 工厂、默认对象与 Config 类型', () => {
    const program = createConsumerTypeProgram(stylelintTypeFixture)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(diagnostics.map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([])
    expect(program.getSourceFiles().map(file => file.fileName.replace(/\\/g, '/')))
      .toContainEqual(expect.stringContaining('/packages/stylelint-config/dist/index.d.ts'))
  }, 30_000)

  it('发布的 Config 类型能拒绝无效参数，不借助类型禁用指令', () => {
    const program = createConsumerTypeProgram(stylelintTypeFixture, `
      import type { Config } from '@zzjtnb/stylelint-config'
      export const invalid: Config = { extends: 123 }
    `)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    // 2322：number 不能赋给 extends 的字符串 / 字符串数组类型。
    expect(diagnostics.map(item => item.code)).toEqual([2322])
    expect(diagnostics[0]?.file?.fileName).toBe(stylelintTypeFixture)
  }, 30_000)

  it('eSLint 的工厂和四个公开类型从正式声明入口消费', () => {
    const program = createConsumerTypeProgram(eslintTypeFixture)
    expect(ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([])
    expect(program.getSourceFiles().map(file => file.fileName.replace(/\\/g, '/')))
      .toContainEqual(expect.stringContaining('/packages/eslint-config/dist/index.d.ts'))
  }, 30_000)

  it('eSLint 首参拒绝 files，文件范围只属于后续配置片段', () => {
    const program = createConsumerTypeProgram(eslintTypeFixture, `
      import type { ESLintConfigOptions } from '@zzjtnb/eslint-config'
      export const invalid: ESLintConfigOptions = { files: ['**/*.ts'] }
    `)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    // 2353：首参对象中不存在 files 属性。
    expect(diagnostics.map(item => item.code)).toEqual([2353])
    expect(diagnostics[0]?.file?.fileName).toBe(eslintTypeFixture)
  }, 30_000)

  it('通过 Markdownlint 包入口加载无需构建的 JSONC 规则', async () => {
    // 从包自身验证 exports，无需额外安装或建立工作区软链接。
    const markdownRequire = createRequire(new URL('../../packages/markdownlint-config/package.json', import.meta.url))
    const entry = markdownRequire.resolve('@zzjtnb/markdownlint-config')
    expect(entry).toBe(fileURLToPath(new URL('../../packages/markdownlint-config/index.jsonc', import.meta.url)))
    expect(await readConfig(entry, [jsoncParse])).toMatchObject({ default: true, MD013: false })
  })

  it('默认 ESLint 集成语言、排序及插件，遵守消费方集成开关', () => {
    const names = eslintFlatConfig.map(config => config.name).filter(Boolean)
    expect(names).toEqual(expect.arrayContaining([
      'antfu/jsonc/setup',
      'antfu/yaml/setup',
      'antfu/toml/setup',
      'antfu/stylistic/rules',
      'antfu/perfectionist/setup',
      'antfu/markdown/setup',
      'antfu/typescript/rules',
    ]))
    expect(eslintFlatConfig.some(config => config.plugins?.shadcn)).toBe(true)
    expect(names).not.toContain('antfu/unocss')
    expect(names.some(name => name?.startsWith('antfu/formatter/'))).toBe(false)
  })

  it('关闭 Stylistic 后仍保留排序配置', async () => {
    const names = (await zzjtnb({ stylistic: false })).map(config => config.name)
    expect(names).not.toContain('antfu/stylistic/rules')
    expect(names).toContain('antfu/perfectionist/setup')
  })

  it('默认忽略生成物，但不忽略 TypeScript 源文件', () => {
    const ignores = eslintFlatConfig.find(config => config.name === 'antfu/ignores')?.ignores ?? []
    expect(ignores).toContain('**/dist')
    expect(ignores).not.toContain('**/*.?([cm])ts')
    expect(ignores).not.toContain('**/*.?([cm])tsx')
  })

  it('eSLint 正式包入口忽略 Tauri 生成物，但不忽略手写资源', async () => {
    const engine = new ESLint({ overrideConfigFile: true, overrideConfig: eslintFlatConfig })
    expect(await engine.isPathIgnored('src-tauri/target/release/resources/app.js')).toBe(true)
    expect(await engine.isPathIgnored('src-tauri/gen/android/app/src/main/assets/app.js')).toBe(true)
    expect(await engine.isPathIgnored('src-tauri/gen/apple/Resources/app.js')).toBe(true)
    expect(await engine.isPathIgnored('src-tauri/resources/app.js')).toBe(false)
  })

  it('正式 ESLint 包入口保留跨语言优先级、声明豁免与根级 YAML 边界', async () => {
    const engine = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        javascript: {
          overrides: { 'no-console': 'error' },
        },
        typescript: {
          overrides: { 'no-console': 'off' },
        },
        yaml: false,
        pnpm: { yaml: true },
      }),
    })
    const tsConfig = await engine.calculateConfigForFile('src/consumer.ts')
    expect(tsConfig?.rules['no-console'][0]).toBe(0)
    const declarations = await engine.calculateConfigForFile('src/consumer.d.ts')
    expect(declarations?.rules['no-restricted-syntax'][0]).toBe(0)
    expect(await engine.calculateConfigForFile('nested/pnpm-workspace.yaml')).toBeUndefined()
  })

  it('消费方规则与忽略项继续生效，并可关闭 pnpm 集成', async () => {
    const config = await zzjtnb({
      ignores: ['generated/**'],
      pnpm: false,
      rules: { 'no-console': 'error' },
    })
    expect(config.some(item => item.rules?.['no-console'] === 'error')).toBe(true)
    expect(config.some(item => item.rules?.['pnpm/yaml-enforce-settings'])).toBe(false)
    expect(config.find(item => item.name === 'antfu/ignores')?.ignores).toContain('generated/**')
  })

  it('pnpm 细分开关保留未关闭的检查，不强加工作区策略', async () => {
    const packageJsonOnly = await zzjtnb({
      pnpm: { sort: false, yaml: false },
    })
    expect(packageJsonOnly.some(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml')).toBe(false)
    expect(packageJsonOnly.some(config => config.name === 'antfu/pnpm/package-json')).toBe(true)
    const withoutCatalogs = await zzjtnb({
      pnpm: { catalogs: false },
    })
    expect(withoutCatalogs.some(config => config.rules?.['pnpm/json-enforce-catalog'])).toBe(false)
    const pnpmConfig = eslintFlatConfig.findLast(config => config.rules?.['pnpm/yaml-enforce-settings'])
    expect(pnpmConfig?.rules?.['pnpm/yaml-enforce-settings']).toBe('off')
  })

  it('将 TOML Schema 指令保护限定于 TOML，关闭集成时不追加覆盖', async () => {
    const config = eslintFlatConfig.findLast(config => config.rules?.['toml/spaced-comment'] === 'off')
    expect(config?.files).toContain('**/*.toml')
    const disabled = await zzjtnb({ toml: false })
    expect(disabled.some(item => item.rules?.['toml/spaced-comment'] === 'off')).toBe(false)
  })

  it('共享 Stylelint 工厂与默认导出一致，按文件类型提供 preset', () => {
    expect(createStylelintConfig()).toEqual(stylelintConfig)
    const { extends: presets, overrides } = stylelintConfig
    assert.ok(Array.isArray(presets))
    assert.ok(Array.isArray(overrides))
    expect(presets.some(path => path.endsWith('/stylelint-config-standard/index.js'))).toBe(true)
    const scss = overrides.find(override => override.files.includes('*.scss'))
    assert.ok(Array.isArray(scss?.extends))
    expect(scss.extends.some(path => path.endsWith('/stylelint-config-recommended-scss/index.js'))).toBe(true)
    expect(scss.extends.some(path => path.endsWith('/stylelint-config-recommended-vue/scss/index.js'))).toBe(false)
    const vue = overrides.find(override => override.files.includes('*.vue'))
    assert.ok(Array.isArray(vue?.extends))
    expect(vue.extends.some(path => path.endsWith('/stylelint-config-recommended-vue/scss/index.js'))).toBe(true)
  })

  it('共享 Stylelint 默认语言扩展、报告与写回策略符合公开契约', () => {
    const { rules, languageOptions } = stylelintConfig
    assert.ok(rules)
    assert.ok(languageOptions?.syntax?.atRules)
    assert.ok(languageOptions.syntax.units?.length)
    expect(Object.hasOwn(rules, 'at-rule-no-unknown')).toBe(false)
    expect(Object.hasOwn(rules, 'unit-no-unknown')).toBe(false)
    expect(Object.hasOwn(languageOptions.syntax.atRules, 'apply')).toBe(false)
    expect(languageOptions.syntax.atRules['custom-variant']?.comment).toBe('Utility-first framework directive')
    expect(languageOptions.syntax.units.length).toEqual(['rpx'])
    expect(stylelintConfig.reportNeedlessDisables).toEqual([
      true,
      { severity: 'warning' },
    ])
    expect(stylelintConfig.reportUnscopedDisables).toEqual([
      true,
      { severity: 'warning' },
    ])
    expect(stylelintConfig).toMatchObject({ allowEmptyInput: true, cache: false, fix: false })
  })

  it('消费方可以向 Stylelint 追加忽略项、规则和文件级覆盖', () => {
    const config = createStylelintConfig({
      ignoreFiles: ['generated/**'],
      rules: { 'no-empty-source': 'error' },
      overrides: [
        {
          files: ['legacy/**/*.scss'],
          rules: { 'scss/operator-no-newline-after': 'error' },
        },
      ],
    })
    assert.ok(config.ignoreFiles)
    assert.ok(config.rules)
    assert.ok(config.overrides)
    expect(config.ignoreFiles).toContain('generated/**')
    expect(config.rules['no-empty-source']).toBe('error')
    expect(config.overrides.some(override => override.files.includes('legacy/**/*.scss'))).toBe(true)
  })
})
