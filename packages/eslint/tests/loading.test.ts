import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as eslintConfigModule from '@zzjtnb/eslint-config'
import { zzjtnb } from '@zzjtnb/eslint-config'
import { ESLint } from 'eslint'
import ts from 'typescript'
import { beforeAll, describe, expect, it } from 'vitest'

const eslintTypeFixture = fileURLToPath(new URL('./consumer.ts', import.meta.url))

/** 编译内存中的消费代码，依赖仍从正式包名及 dist 声明解析。 */
function createConsumerTypeProgram(source: string) {
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
  const getSourceFile = host.getSourceFile.bind(host)
  host.getSourceFile = (...args) => args[0] === eslintTypeFixture
    ? ts.createSourceFile(eslintTypeFixture, source, ts.ScriptTarget.ESNext, true)
    : getSourceFile(...args)
  return ts.createProgram([eslintTypeFixture], options, host)
}

describe('eslint 发布入口', () => {
  let eslintFlatConfig: Awaited<ReturnType<typeof zzjtnb>>

  beforeAll(async () => {
    const result = zzjtnb({ unocss: false, vue: false })
    expect(result).toBeInstanceOf(Promise)
    eslintFlatConfig = await result
  }, 30_000)
  it('通过包名加载 ESLint 构建产物及公开导出', () => {
    expect(import.meta.resolve('@zzjtnb/eslint-config')).toBe(new URL('../dist/index.mjs', import.meta.url).href)
    expect(Object.keys(eslintConfigModule)).toEqual(['zzjtnb'])
  })

  it('默认加载器读取真实的 ESM JavaScript 配置，无需额外 flag', async () => {
    const root = fileURLToPath(new URL('../../../.tmp/eslint-config-loading/', import.meta.url))
    await mkdir(root, { recursive: true })
    const cwd = await mkdtemp(join(root, 'consumer-'))
    const configFile = join(cwd, 'eslint.config.js')
    await writeFile(join(cwd, 'package.json'), JSON.stringify({ type: 'module' }))
    // 加载正式发布入口，不通过内存配置绕过配置文件加载。
    await writeFile(configFile, `
import { zzjtnb } from ${JSON.stringify(import.meta.resolve('@zzjtnb/eslint-config'))}
export default zzjtnb({ vue: false, pnpm: false, gitignore: false })
`)
    const engine = new ESLint({ cwd, overrideConfigFile: configFile })
    const config = await engine.calculateConfigForFile(join(cwd, 'sample.ts'))
    expect(config?.rules['antfu/no-import-dist'][0]).toBe(2)
    const [result] = await engine.lintText('export const value = 1\n', { filePath: 'sample.ts' })
    expect(result?.messages).toEqual([])
  }, 30_000)

  it.each([
    {
      name: 'UnoCSS',
      options: { unocss: true },
      plugins: ['unocss'],
    },
    {
      name: 'formatter',
      options: {
        formatters: { html: true, css: false, markdown: false },
      },
      plugins: ['format'],
    },
    {
      name: 'Vue 无障碍',
      options: {
        vue: { a11y: true },
      },
      plugins: ['vue-a11y'],
    },
    {
      name: 'antislop',
      options: { antislop: true },
      plugins: ['slop', 'sonarjs'],
    },
  ])('$name 使用 antfu 正式选项加载本包提供的扩展', async ({ options, plugins }) => {
    const configs = await zzjtnb({ pnpm: false, ...options })
    const loaded = configs.flatMap(config => Object.keys(config.plugins ?? {}))
    expect(loaded).toEqual(expect.arrayContaining(plugins))
  }, 30_000)

  it('eSLint 的工厂和四个公开类型从正式声明入口消费', () => {
    const program = createConsumerTypeProgram(`
import type {
  ESLintConfigOptions,
  ESLintPnpmOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from '@zzjtnb/eslint-config'
import type { Linter } from 'eslint'

import { zzjtnb } from '@zzjtnb/eslint-config'

const stylistic: ESLintStylisticOptions = { semi: true }
const pnpm: ESLintPnpmOptions = { yaml: false, catalogs: false }
const options: ESLintConfigOptions = {
  stylistic,
  pnpm,
  defaultIgnores: ['**/generated/**'],
  vue: {
    overrides: { 'vue/require-default-prop': 'off' },
  },
}
const fileConfig: ESLintUserConfig = {
  files: ['**/*.ts'],
  rules: { 'no-console': 'warn' },
}

// 返回值、四个公开类型和上游对象选项均从发布声明获得，不借助仓库源码 paths。
export const config: Promise<Linter.Config[]> = zzjtnb(options, fileConfig)
`)
    expect(ts.getPreEmitDiagnostics(program).map(item => ts.flattenDiagnosticMessageText(item.messageText, '\n'))).toEqual([])
    expect(program.getSourceFiles().map(file => file.fileName.replace(/\\/g, '/')))
      .toContainEqual(expect.stringContaining('/packages/eslint/dist/index.d.mts'))
  }, 30_000)

  it('发布返回类型保留上游已知规则参数提示并拒绝错误选项', () => {
    const source = `
import { zzjtnb } from '@zzjtnb/eslint-config'
async function configure() {
  const configs = await zzjtnb()
  const config = configs[0]!
  config.rules = { 'no-console': ['warn', { allow: ['warn'] }] }
}
void configure
`
    expect(ts.getPreEmitDiagnostics(createConsumerTypeProgram(source))).toEqual([])
    const invalid = source.replace('allow: [\'warn\']', 'allow: 123')
    const diagnostics = ts.getPreEmitDiagnostics(createConsumerTypeProgram(invalid))
    expect(diagnostics.length).toBeGreaterThan(0)
    expect(diagnostics.every(item => item.file?.fileName === eslintTypeFixture)).toBe(true)
  })

  it.each(['files', 'overrides'] as const)('eSLint 首参不接受 %s，使用正式片段或集成选项', (field) => {
    const program = createConsumerTypeProgram(`
      import type { ESLintConfigOptions } from '@zzjtnb/eslint-config'
      export const invalid: ESLintConfigOptions = { ${field}: ${field === 'files'
        ? '[\'**/*.ts\']'
        : '{}'} }
    `)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    // 2353：文件范围和已弃用顶层字段不能作为首参属性。
    expect(diagnostics.map(item => item.code)).toEqual([2353])
    expect(diagnostics[0]?.file?.fileName).toBe(eslintTypeFixture)
  }, 30_000)

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
    expect(await engine.isPathIgnored('src-tauri/resources/app.js')).toBe(true)
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
    const nested = await engine.calculateConfigForFile('nested/pnpm-workspace.yaml')
    expect(nested?.languageOptions.parser.meta?.name).not.toBe('yaml-eslint-parser')
    expect(nested?.rules['pnpm/yaml-enforce-settings']).toBeUndefined()
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
    expect(pnpmConfig?.rules?.['pnpm/yaml-enforce-settings']).toMatchObject([
      'error',
      {
        settings: { minimumReleaseAgeExcludePrune: true, shellEmulator: true },
      },
    ])
  })

  it('将 TOML Schema 指令保护限定于 TOML，关闭集成时不追加覆盖', async () => {
    const config = eslintFlatConfig.findLast(config => config.rules?.['toml/spaced-comment'] === 'off')
    expect(config?.files).toContain('**/*.toml')
    const disabled = await zzjtnb({ toml: false })
    expect(disabled.some(item => item.rules?.['toml/spaced-comment'] === 'off')).toBe(false)
  })
})
