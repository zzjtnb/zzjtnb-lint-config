import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import { describe, expect, it } from 'vitest'

import { zzjtnb } from '../src/index'

async function createEngine(options: Parameters<typeof zzjtnb>[0] = {}) {
  return new ESLint({
    overrideConfigFile: true,
    overrideConfig: await zzjtnb({ isInEditor: false, ...options }),
  })
}

describe('eSLint 上游选项与生成物边界', () => {
  it('typeScript parser 选项和规则覆盖均保留消费方的最终选择', async () => {
    const engine = await createEngine({
      pnpm: false,
      typescript: {
        parserOptions: {
          experimentalDecorators: false,
          emitDecoratorMetadata: false,
        },
        overrides: { 'ts/consistent-type-imports': 'off' },
      },
    })
    const config = await engine.calculateConfigForFile('source.ts')
    expect(config?.languageOptions.parserOptions).toMatchObject({
      experimentalDecorators: false,
      emitDecoratorMetadata: false,
    })
    expect(config?.rules['ts/consistent-type-imports'][0]).toBe(0)
  })

  it('沿用官方自动修复，将两类依赖迁入根目录并保留不同版本', async () => {
    const parent = new URL('../../../.tmp/pnpm-autofix/', import.meta.url)
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(fileURLToPath(new URL('consumer-', parent)))
    const app = join(directory, 'packages', 'app')
    await mkdir(app, { recursive: true })
    await writeFile(join(directory, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\ncatalog:\n  typescript: ^7.0.2\n  vue: ^3.5.44\n')
    await writeFile(join(directory, 'package.json'), JSON.stringify({
      name: 'consumer-root',
      private: true,
      devDependencies: { typescript: 'catalog:' },
    }))
    const input = JSON.stringify({
      name: 'consumer-app',
      dependencies: { vue: '^3.5.44' },
      devDependencies: { typescript: '~6.0.0', vitest: '^5.0.5' },
    })
    const file = join(app, 'package.json')
    await writeFile(file, input)
    const engine = new ESLint({
      cwd: directory,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: true,
        isInEditor: false,
        gitignore: false,
        defaultIgnores: false,
        ignores: [],
      }),
    })
    const results = await engine.lintFiles([file])
    await ESLint.outputFixes(results)
    // 插件延迟写 workspace，等待实际落盘后验证，而不是仅检查内存中的修复结果。
    await new Promise(resolve => setTimeout(resolve, 1200))
    const fixed = JSON.parse(await readFile(file, 'utf8'))
    expect(fixed.dependencies.vue).toBe('catalog:')
    expect(fixed.devDependencies.typescript).toMatch(/^catalog:/)
    expect(fixed.devDependencies.vitest).toBe('catalog:')
    const workspace = await readFile(join(directory, 'pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toContain('typescript: ^7.0.2')
    expect(workspace).toContain('typescript: ~6.0.0')
    expect(workspace).toContain('vitest: ^5.0.5')
    // 上游会跨文件延迟更新 catalog；落盘后再次检查必须稳定，不能持续改写消费项目。
    const [stable] = await engine.lintFiles([file])
    expect(stable?.output).toBeUndefined()
    expect(stable?.messages).toEqual([])
    const [checked] = await engine.lintFiles([
      join(directory, 'pnpm-workspace.yaml'),
    ])
    expect(checked?.messages.filter(message => ['pnpm/yaml-no-unused-catalog-item', 'pnpm/yaml-no-duplicate-catalog-item'].includes(message.ruleId ?? ''))).toEqual([])
  }, 15_000)

  it('保留上游 process 导入规则，允许显式导入', async () => {
    const engine = await createEngine({ pnpm: false })
    const [global] = await engine.lintText('export const port = process.env.PORT\n', { filePath: 'server.ts' })
    expect(global?.messages.some(message => message.ruleId === 'node/prefer-global/process')).toBe(true)
    const [imported] = await engine.lintText('import process from \'node:process\'\nexport const port = process.env.PORT\n', { filePath: 'server.ts' })
    expect(imported?.messages.filter(message => message.ruleId === 'node/prefer-global/process')).toEqual([])
  })

  it.each([
    '.nuxt/app.js',
    '.wrangler/app.js',
    'releases/app.js',
    'src-tauri/resources/app.js',
    'src-tauri/target/release/bundle/resources/app.js',
    'src-tauri/target/aarch64-apple-darwin/release/resources/app.js',
    'src-tauri/gen/android/app/src/main/assets/app.js',
    'src-tauri/gen/apple/Resources/app.js',
  ])('默认忽略 Tauri 生成物：%s', async (path) => {
    const engine = await createEngine({ pnpm: false })
    expect(await engine.isPathIgnored(path)).toBe(true)
  })

  it.each([
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
    expect(received).toEqual(expect.arrayContaining(['**/src-tauri/**']))
    expect(await engine.isPathIgnored('custom-generated/app.js')).toBe(true)
  })

  it('关闭 stylistic 后，不重新应用对应的分组覆盖', async () => {
    const engine = await createEngine({
      pnpm: false,
      stylistic: false,
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['style/quotes']).toBeUndefined()
  })

  it('上游 stylistic 覆盖不能被本包默认规则盖回去', async () => {
    const engine = await createEngine({
      pnpm: false,
      stylistic: {
        overrides: { 'antfu/consistent-chaining': 'error' },
      },
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['antfu/consistent-chaining'][0]).toBe(2)
  })

  it('imports 对象可显式覆盖上游默认的 dist 导入限制', async () => {
    const engine = await createEngine({
      pnpm: false,
      imports: {
        overrides: { 'antfu/no-import-dist': 'off' },
      },
    })
    const config = await engine.calculateConfigForFile('consumer.js')
    expect(config?.rules['antfu/no-import-dist'][0]).toBe(0)
  })

  it('stylistic 对象可覆盖本包默认值，首参 rules 与后续片段继续优先', async () => {
    const base = {
      pnpm: false,
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
    expect(config?.rules['pnpm/yaml-enforce-settings'][1].settings).not.toHaveProperty('trustPolicy')
  })

  it.each([
    ['~6.0.0', false],
    ['^7.0.2', true],
  ] as const)('命名 catalog 中 TypeScript %s 的重复判断按完整版本声明执行', async (version, duplicate) => {
    // 插件只检查所属工作区入口；包内运行时不能借用仓库根的 workspace。
    const parent = new URL('../../../.tmp/catalog-tests/', import.meta.url)
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(fileURLToPath(new URL('consumer-', parent)))
    const source = `catalog:\n  typescript: ^7.0.2\ncatalogs:\n  frontend:\n    typescript: ${version}\n`
    await writeFile(join(directory, 'pnpm-workspace.yaml'), source)
    await writeFile(join(directory, 'package.json'), '{"name":"catalog-test","private":true}')
    const engine = new ESLint({
      cwd: directory,
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: true, isInEditor: false }),
    })
    const [result] = await engine.lintText(source, { filePath: 'pnpm-workspace.yaml' })
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages.some(message => message.ruleId === 'pnpm/yaml-no-duplicate-catalog-item')).toBe(duplicate)
    // 当前插件虽然声明 fixable，实际重复项诊断未附带修复，不把声明误当成可执行修复。
    expect(result?.messages.filter(message => message.ruleId === 'pnpm/yaml-no-duplicate-catalog-item').every(message => message.fix === undefined)).toBe(true)
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
    // antislop 可以匹配该路径，但 pnpm 不应扩大 YAML parser 或策略的作用范围。
    const config = await engine.calculateConfigForFile('nested/pnpm-workspace.yaml')
    expect(config?.languageOptions.parser.meta?.name).not.toBe('yaml-eslint-parser')
    expect(config?.rules['pnpm/yaml-enforce-settings']).toBeUndefined()
  })

  it('关闭 YAML 时不因本包的 pnpm 覆盖重新纳入工作区 YAML 文件', async () => {
    const engine = await createEngine({ yaml: false, pnpm: true })
    const config = await engine.calculateConfigForFile('pnpm-workspace.yaml')
    expect(config?.languageOptions.parser.meta?.name).not.toBe('yaml-eslint-parser')
    expect(config?.rules['pnpm/yaml-enforce-settings']).toBeUndefined()
  })
})

it('原生 Node 测试导入保持不变，消费方仍可重新启用限制', async () => {
  const engine = new ESLint({ fix: true, overrideConfigFile: true, overrideConfig: await zzjtnb({ pnpm: false }) })
  const [result] = await engine.lintText('import { it } from \'node:test\'\nit(\'works\', () => {})\n', { filePath: 'sample.test.js' })
  expect(result?.output ?? '').not.toContain('from \'vitest\'')
  expect((await engine.calculateConfigForFile('sample.test.js'))?.rules['test/no-import-node-test'][0]).toBe(0)
  const explicit = await createEngine({
    test: {
      overrides: { 'test/no-import-node-test': 'error' },
    },
  })
  expect((await explicit.calculateConfigForFile('sample.test.js'))?.rules['test/no-import-node-test'][0]).toBe(2)
  expect((await zzjtnb({ test: false })).some(config => config.rules?.['test/no-import-node-test'])).toBe(false)
})

it('默认开启 antislop 与 Vue 无障碍，消费方可以关闭集成或单独关闭无障碍', async () => {
  const defaults = await createEngine({ pnpm: false })
  const config = await defaults.calculateConfigForFile('component.vue')
  expect(config.plugins).toHaveProperty('vue-a11y')
  expect(config.plugins).toHaveProperty('slop')
  expect(config.plugins).toHaveProperty('sonarjs')
  const [result] = await defaults.lintText('<template><img src="avatar.png"></template>', { filePath: 'component.vue' })
  expect(result?.messages.some(message => message.ruleId === 'vue-a11y/alt-text')).toBe(true)

  const disabled = await createEngine({
    pnpm: false,
    antislop: false,
    vue: { a11y: false },
  })
  const custom = await disabled.calculateConfigForFile('component.vue')
  expect(custom.plugins).not.toHaveProperty('vue-a11y')
  expect(custom.plugins).not.toHaveProperty('slop')
  expect(custom.plugins).not.toHaveProperty('sonarjs')
  const noVue = await createEngine({ pnpm: false, vue: false })
  expect((await noVue.calculateConfigForFile('source.ts')).plugins).not.toHaveProperty('vue-a11y')
})

it('antislop 不把独立文档和样式纳入 JavaScript 解析，Vue 样式块仍正常处理', async () => {
  const engine = await createEngine({ pnpm: false, markdown: false, yaml: false })
  for (const file of ['guide.md', 'theme.css', 'theme.scss'])
    expect(await engine.calculateConfigForFile(file)).toBeUndefined()
  const [result] = await engine.lintText('<template><div>内容</div></template>\n<style scoped>\n.card { color: red; }\n</style>\n', { filePath: 'component.vue' })
  expect(result?.fatalErrorCount).toBe(0)
})

it('指定的语法和风格规则报告 warn，warn 规则仍提供自动修复', async () => {
  const engine = await createEngine({ pnpm: false })
  const config = await engine.calculateConfigForFile('source.js')
  for (const rule of [
    'no-console',
    'no-undef',
    'no-restricted-syntax',
    'antfu/consistent-chaining',
    'antfu/consistent-list-newline',
    'antfu/curly',
    'antfu/if-newline',
    'antfu/top-level-function',
  ])
    expect(config.rules[rule][0], rule).toBe(1)
  const fixing = new ESLint({ fix: true, overrideConfigFile: true, overrideConfig: await zzjtnb({ pnpm: false, isInEditor: false }) })
  const [result] = await fixing.lintText('export const greet = (name) => { return name }\n', { filePath: 'source.js' })
  expect(result?.output).toContain('export function greet')
})

it.each([
  '.codegraph/example.js',
  'nested/.codegraph/example.ts',
  '.tmp/example.js',
  'nested/.tmp/example.ts',
  '.cache/example.js',
  'nested/.cache/example.ts',
  '.output/server.js',
  'nested/.output/server.ts',
])('共享默认忽略临时目录，关闭 Git 忽略时仍生效：%s', async (path) => {
  const engine = await createEngine({ pnpm: false, gitignore: false })
  expect(await engine.isPathIgnored(path)).toBe(true)
  const consumer = await createEngine({ pnpm: false, gitignore: false, defaultIgnores: false })
  expect(await consumer.isPathIgnored(path)).toBe(false)
})

it.each(['.git/internal.js', 'nested/.git/internal.js'])('共享默认排除根级与嵌套 Git 元数据：%s', async (path) => {
  const engine = await createEngine({ pnpm: false, gitignore: false })
  expect(await engine.isPathIgnored(path)).toBe(true)
})

it('默认允许顶层 await，消费方仍可显式启用限制', async () => {
  const source = 'export const settings = await Promise.resolve({})\n'
  const engine = await createEngine({ pnpm: false })
  const [result] = await engine.lintText(source, { filePath: 'source.js' })
  expect(result?.fatalErrorCount).toBe(0)
  expect((await engine.calculateConfigForFile('source.js')).rules['antfu/no-top-level-await'][0]).toBe(0)
  expect(result?.messages.filter(message => message.ruleId === 'antfu/no-top-level-await')).toHaveLength(0)
  for (const options of [
    {
      rules: { 'antfu/no-top-level-await': 'error' as const },
    },
    {
      javascript: {
        overrides: { 'antfu/no-top-level-await': 'error' as const },
      },
    },
  ]) {
    const consumer = await createEngine({ pnpm: false, ...options })
    const [restricted] = await consumer.lintText(source, { filePath: 'source.js' })
    expect(restricted?.messages.filter(message => message.ruleId === 'antfu/no-top-level-await')).toEqual([
      expect.objectContaining({ severity: 2 }),
    ])
  }
})

it('允许注释代码示例，保留其他 SonarJS 检查和消费方覆盖', async () => {
  const source = '/**\n * 从文件读取环境变量。\n * https://github.com/motdotla/dotenv\n */\n// require(\'dotenv\').config();\n'
  const engine = await createEngine({ pnpm: false })
  const config = await engine.calculateConfigForFile('source.js')
  expect(config.rules['sonarjs/no-commented-code'][0]).toBe(0)
  expect(config.rules['sonarjs/no-identical-conditions'][0]).toBe(2)
  expect((await engine.lintText(source, { filePath: 'source.js' }))[0]?.messages.filter(message => message.ruleId === 'sonarjs/no-commented-code')).toHaveLength(0)
  for (const options of [
    {
      antislop: {
        overrides: { 'sonarjs/no-commented-code': 'error' as const },
      },
    },
    {
      rules: { 'sonarjs/no-commented-code': 'error' as const },
    },
  ]) {
    const consumer = await createEngine({ pnpm: false, ...options })
    // 验证公开覆盖契约，不在此重测 SonarJS 自身的注释解析实现。
    expect((await consumer.calculateConfigForFile('source.js')).rules['sonarjs/no-commented-code'][0]).toBe(2)
  }
  const disabled = await createEngine({ pnpm: false, antislop: false })
  expect((await disabled.calculateConfigForFile('source.js')).plugins).not.toHaveProperty('sonarjs')
})
