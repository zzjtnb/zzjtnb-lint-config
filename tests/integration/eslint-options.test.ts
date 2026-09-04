import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import { zzjtnb } from '../../packages/eslint-config/src/index.js'

async function createEngine(options: Parameters<typeof zzjtnb>[0] = {}) {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({ isInEditor: false, ...options }),
  })
}

describe('eSLint 上游选项与生成物边界', () => {
  it.each([
    'src-tauri/target/release/bundle/resources/app.js',
    'src-tauri/target/aarch64-apple-darwin/release/resources/app.js',
    'src-tauri/gen/android/app/src/main/assets/app.js',
    'src-tauri/gen/apple/Resources/app.js',
  ])('默认忽略 Tauri 生成物：%s', async (path) => {
    const engine = await createEngine({ pnpm: false })
    expect(await engine.isPathIgnored(path)).toBe(true)
  })

  it.each([
    'src-tauri/resources/app.js',
    'src/main.ts',
    'gen/app.js',
    'target/app.js',
  ])('不扩大 Tauri 忽略范围：%s', async (path) => {
    const engine = await createEngine({ pnpm: false })
    expect(await engine.isPathIgnored(path)).toBe(false)
  })

  it('defaultIgnores=false 时消费方仍可接管忽略范围', async () => {
    const engine = await createEngine({ pnpm: false, defaultIgnores: false, gitignore: false })
    expect(await engine.isPathIgnored('src-tauri/gen/app.js')).toBe(false)
  })

  it('消费方忽略回调能读取 Tauri 默认项并追加自己的路径', async () => {
    let received: string[] = []
    const engine = await createEngine({
      pnpm: false,
      ignores(originals) {
        received = originals
        return [...originals, '**/custom-generated/**']
      },
    })
    expect(received).toEqual(expect.arrayContaining(['**/src-tauri/target/**', '**/src-tauri/gen/**']))
    expect(await engine.isPathIgnored('custom-generated/app.js')).toBe(true)
  })

  it('关闭 stylistic 后，不重新应用对应的分组覆盖', async () => {
    const engine = await createEngine({
      pnpm: false,
      stylistic: false,
      overrides: {
        stylistic: {
          'style/quotes': ['error', 'double'],
        },
      },
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['style/quotes']).toBeUndefined()
  })

  it('上游 stylistic 覆盖不能被本包默认规则盖回去', async () => {
    const engine = await createEngine({
      pnpm: false,
      overrides: {
        stylistic: { 'antfu/consistent-chaining': 'error' },
      },
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['antfu/consistent-chaining'][0]).toBe(2)
  })

  it('imports 对象的覆盖优先于共享默认值', async () => {
    const engine = await createEngine({
      pnpm: false,
      imports: {
        overrides: { 'antfu/no-import-dist': 'error' },
      },
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['antfu/no-import-dist'][0]).toBe(2)
  })

  it('stylistic 对象覆盖高于分组覆盖，首参 rules 与后续片段优先级更高', async () => {
    const base = {
      pnpm: false,
      overrides: {
        stylistic: { 'antfu/consistent-chaining': 'error' },
      },
      stylistic: {
        overrides: { 'antfu/consistent-chaining': 'warn' },
      },
    } as const
    const engine = await createEngine(base)
    expect((await engine.calculateConfigForFile('consumer.js'))?.rules['antfu/consistent-chaining'][0]).toBe(1)
    const config = await zzjtnb(
      {
        ...base,
        rules: { 'antfu/consistent-chaining': 'off' },
      },
      {
        files: ['**/*.js'],
        rules: { 'antfu/consistent-chaining': 'error' },
      },
    )
    const final = new ESLint({ overrideConfigFile: true, overrideConfig: config })
    expect((await final.calculateConfigForFile('consumer.js'))?.rules['antfu/consistent-chaining'][0]).toBe(2)
  })

  it('pnpm 对象可以显式重新启用工作区 YAML，覆盖顶层 yaml=false', async () => {
    const engine = await createEngine({
      yaml: false,
      pnpm: { yaml: true },
    })
    const [result] = await engine.lintText('packages:\n  - apps/*\n', { filePath: 'pnpm-workspace.yaml' })
    expect(result?.fatalErrorCount).toBe(0)
    const config = await engine.calculateConfigForFile('pnpm-workspace.yaml')
    expect(config?.rules['pnpm/yaml-enforce-settings'][0]).toBe(0)
  })

  it('修改一次调用返回的语法限制数组，不影响后续调用', async () => {
    const first = await zzjtnb({ pnpm: false, isInEditor: false })
    const rules = first.find(config => config.name === 'antfu/javascript/rules')!.rules!
    const restriction = rules['no-restricted-syntax']
    if (!Array.isArray(restriction))
      throw new TypeError('共享语法限制应为规则选项数组')
    const expected = [...restriction]
    restriction.push('BreakStatement')
    try {
      const second = await zzjtnb({ pnpm: false, isInEditor: false })
      expect(second.find(config => config.name === 'antfu/javascript/rules')?.rules?.['no-restricted-syntax']).toEqual(expected)
    }
    finally {
      restriction.pop()
    }
  })

  it('vue 规则的嵌套选项不会在工厂调用间共享', async () => {
    const first = await zzjtnb({ pnpm: false, isInEditor: false })
    const second = await zzjtnb({ pnpm: false, isInEditor: false })
    const rule = (configs: typeof first) => configs.find(config => config.name === 'antfu/vue/rules')!.rules!['vue/block-order']
    const before = rule(first)
    const after = rule(second)
    expect(before).toEqual(after)
    expect(before).not.toBe(after)
    if (!Array.isArray(before) || !Array.isArray(after))
      throw new TypeError('组件块顺序应为规则选项数组')
    expect(before[1]).not.toBe(after[1])
  })

  it('javaScript 分组覆盖不能反向覆盖 TypeScript 文件的后置设置', async () => {
    const engine = await createEngine({
      pnpm: false,
      javascript: {
        overrides: { 'no-console': 'error' },
      },
      typescript: {
        overrides: { 'no-console': 'off' },
      },
    })
    const [result] = await engine.lintText('console.log(1)\n', { filePath: 'src/handler.ts' })
    expect(result?.messages.filter(message => message.ruleId === 'no-console')).toEqual([])
    const js = await engine.calculateConfigForFile('src/handler.js')
    expect(js?.rules['no-console'][0]).toBe(2)
  })

  it.each(['src/types.d.ts', 'src/types.d.mts', 'src/types.d.cts'])('第三方模块声明保留上游 export assignment 豁免：%s', async (filePath) => {
    const engine = await createEngine({ pnpm: false })
    const [result] = await engine.lintText(
      'declare module \'legacy-package\' {\n  function legacy(): void\n  export = legacy\n}\n',
      { filePath },
    )
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages.filter(message => message.ruleId === 'no-restricted-syntax')).toEqual([])
  })

  it('实现代码仍保留本包的 export assignment 限制', async () => {
    const engine = await createEngine({ pnpm: false })
    const [result] = await engine.lintText('const legacy = 1\nexport = legacy\n', { filePath: 'src/legacy.ts' })
    expect(result?.messages.some(message => message.ruleId === 'no-restricted-syntax')).toBe(true)
  })

  it('普通 YAML 仍可检查嵌套 workspace 文件，但不追加根级 pnpm 策略', async () => {
    const engine = await createEngine({ yaml: true, pnpm: true })
    const [result] = await engine.lintText('packages:\n  - apps/*\n', { filePath: 'nested/pnpm-workspace.yaml' })
    expect(result?.fatalErrorCount).toBe(0)
    const config = await engine.calculateConfigForFile('nested/pnpm-workspace.yaml')
    expect(config?.rules['pnpm/yaml-enforce-settings']).toBeUndefined()
  })

  it('pnpm 规则不扩大上游 workspace YAML parser 的根级范围', async () => {
    const engine = await createEngine({
      yaml: false,
      pnpm: { yaml: true },
    })
    expect(await engine.calculateConfigForFile('nested/pnpm-workspace.yaml')).toBeUndefined()
  })

  it('关闭 YAML 时不因本包的 pnpm 覆盖重新纳入工作区 YAML 文件', async () => {
    const engine = await createEngine({ yaml: false, pnpm: true })
    expect(await engine.calculateConfigForFile('pnpm-workspace.yaml')).toBeUndefined()
  })
})
