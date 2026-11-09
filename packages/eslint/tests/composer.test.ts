import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
/** 验证上游三类覆盖入口、配置组合状态与 formatter 的真实消费行为。 */
import { ESLint } from 'eslint'
import { composer } from 'eslint-flat-config-utils'
import { expect, it } from 'vitest'
import { zzjtnb } from '../src/index'
import { paths } from './config'

it('工厂直接返回 Composer，后续命名覆盖和前后插入保留优先级', async () => {
  const configs = zzjtnb({ pnpm: false, vue: false })
    .prepend({
      name: 'consumer/first',
      rules: { 'no-console': 'off' },
    })
    .override('antfu/javascript/rules', {
      rules: { 'no-console': 'error' },
    })
    .append({
      name: 'consumer/last',
      rules: { 'no-console': 'warn' },
    })
  expect(configs.prepend).toBeTypeOf('function')
  expect(configs.clone).toBeTypeOf('function')
  const resolved = await configs.toConfigs()
  expect(resolved[0]?.name).toBe('consumer/first')
  expect(resolved.at(-1)?.name).toBe('consumer/last')
  expect(resolved.find(config => config.name === 'antfu/javascript/rules')?.rules?.['no-console']).toBe('error')
  const engine = new ESLint({ overrideConfigFile: true, overrideConfig: await configs })
  expect((await engine.calculateConfigForFile('sample.js'))?.rules['no-console'][0]).toBe(1)
})

it('后续 Composer 覆盖 pnpm 差异时不会被本包回调反向修改', async () => {
  const resolved = await zzjtnb({ pnpm: true, vue: false })
    .override('antfu/pnpm/pnpm-workspace-yaml', {
      rules: { 'pnpm/yaml-no-duplicate-catalog-item': 'off' },
    })
  expect(resolved.find(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml')?.rules?.['pnpm/yaml-no-duplicate-catalog-item']).toBe('off')
})

it('后置 Composer 的配置即使使用上游名称，也不接受本包内部回调修改', async () => {
  const external = composer({
    name: 'antfu/pnpm/pnpm-workspace-yaml',
    rules: { 'pnpm/yaml-enforce-settings': 'off', 'pnpm/yaml-no-duplicate-catalog-item': 'off' },
  })
  const configs = await zzjtnb({ pnpm: false, vue: false }, external)
  expect(configs.find(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml')?.rules?.['pnpm/yaml-enforce-settings']).toBe('off')
})

it('集成覆盖和带 files 的后置配置均生效，不把 Vue 规则扩散到 JavaScript', async () => {
  const engine = new ESLint({
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      vue: {
        overrides: {
          'vue/operator-linebreak': ['warn', 'after'],
        },
      },
      typescript: {
        overrides: {
          'ts/consistent-type-definitions': ['error', 'interface'],
        },
      },
    }, {
      files: ['**/*.vue'],
      rules: {
        'vue/operator-linebreak': ['error', 'before'],
      },
    }),
  })
  expect((await engine.calculateConfigForFile('sample.vue'))?.rules['vue/operator-linebreak']).toEqual([2, 'before'])
  expect((await engine.calculateConfigForFile('sample.js'))?.rules['vue/operator-linebreak']).toBeUndefined()
  expect((await engine.calculateConfigForFile('sample.ts'))?.rules['ts/consistent-type-definitions']).toEqual([2, 'interface'])
})

it('上游仍支持的顶层 overrides 原样保留，集成内 overrides 优先', async () => {
  const engine = new ESLint({
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      vue: false,
      overrides: {
        javascript: { 'no-console': 'error' },
        stylistic: { 'antfu/consistent-chaining': 'error' },
        toml: { 'toml/spaced-comment': 'error' },
      },
      toml: {
        overrides: { 'toml/spaced-comment': 'warn' },
      },
    }),
  })
  const javascript = await engine.calculateConfigForFile('sample.js')
  expect(javascript?.rules['no-console'][0]).toBe(2)
  expect(javascript?.rules['antfu/consistent-chaining'][0]).toBe(2)
  expect((await engine.calculateConfigForFile('sample.toml'))?.rules['toml/spaced-comment'][0]).toBe(1)
})

it('后置数组、异步配置和其他 Composer 保留原生合并及默认忽略状态', async () => {
  const external = composer({
    name: 'external/rules',
    rules: { 'no-alert': 'error' },
  })
    .setDefaultIgnores(previous => [...previous, '**/*.external'])
  const configs = await zzjtnb({ pnpm: false, vue: false }, [
    {
      name: 'consumer/array',
      rules: { 'no-console': 'off' },
    },
  ], Promise.resolve({
    name: 'consumer/async',
    rules: { 'no-console': 'warn' },
  }), external).override('external/rules', {
    rules: { 'no-alert': 'warn' },
  })
  expect(configs.find(config => config.name === 'external/rules')?.rules?.['no-alert']).toBe('warn')
  expect(configs.find(config => config.name === 'consumer/async')?.ignores).toEqual(expect.arrayContaining(['**/*.md', '**/*.external']))
  const engine = new ESLint({ overrideConfigFile: true, overrideConfig: configs })
  expect((await engine.calculateConfigForFile('sample.js'))?.rules['no-console'][0]).toBe(1)
})

it('typeScript overridesTypeAware 直接进入上游类型感知配置', async () => {
  const parent = paths.typeAware
  await mkdir(parent, { recursive: true })
  const directory = await mkdtemp(parent)
  const source = 'export const value: number = 1\n'
  await writeFile(join(directory, 'source.ts'), source)
  await writeFile(join(directory, 'tsconfig.json'), '{"compilerOptions":{"strict":true},"include":["source.ts"]}')
  const engine = new ESLint({
    cwd: directory,
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      gitignore: false,
      vue: false,
      typescript: {
        tsconfigPath: join(directory, 'tsconfig.json'),
        parserOptions: { tsconfigRootDir: directory },
        overridesTypeAware: { 'ts/no-unsafe-assignment': 'warn' },
      },
    }),
  })
  expect((await engine.calculateConfigForFile(join(directory, 'source.ts')))?.rules['ts/no-unsafe-assignment'][0]).toBe(1)
  expect((await engine.lintText(source, {
    filePath: join(directory, 'source.ts'),
  }))[0]?.fatalErrorCount).toBe(0)
}, 30_000)

it('嵌套 Composer 传递 Markdown 默认忽略，显式文件范围仍可覆盖 Markdown', async () => {
  const configs = zzjtnb({ pnpm: false, vue: false })
    .append({
      name: 'consumer/javascript',
      rules: { 'no-irregular-whitespace': 'error' },
    })
    .append({
      name: 'consumer/markdown',
      files: ['**/*.md'],
      rules: { 'markdown/no-html': 'off' },
    })
  const resolved = await configs
  expect(resolved.find(config => config.name === 'zzjtnb/plugins')?.ignores).toContain('**/*.md')
  expect(resolved.find(config => config.name === 'consumer/javascript')?.ignores).toContain('**/*.md')
  expect(resolved.find(config => config.name === 'consumer/markdown')?.ignores).toBeUndefined()
  const engine = new ESLint({ overrideConfigFile: true, overrideConfig: await configs })
  const [result] = await engine.lintText('# Heading\n\nText.\n', { filePath: 'guide.md' })
  expect(result?.fatalErrorCount).toBe(0)
})

it('使用本包提供的 format/oxfmt 真实修复，无需消费方另装插件或 formatter', async () => {
  const engine = new ESLint({
    fix: true,
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({
      pnpm: false,
      vue: false,
      stylistic: false,
      formatters: {},
    }, {
      files: ['**/*.{js,ts}'],
      rules: { 'format/oxfmt': 'error' },
    }),
  })
  const input = 'export const value={message:"hello"}\n'
  const [result] = await engine.lintText(input, { filePath: 'format-example.ts' })
  expect(result?.fatalErrorCount).toBe(0)
  expect(result?.output).toBeDefined()
  expect(result?.output).not.toBe(input)
  expect(result?.messages.filter(message => message.ruleId === 'format/oxfmt')).toEqual([])
}, 30_000)
