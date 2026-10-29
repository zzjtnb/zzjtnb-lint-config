import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import * as stylelintConfigModule from '@zzjtnb/stylelint-config'
import stylelintConfig, { zzjtnb as createStylelintConfig } from '@zzjtnb/stylelint-config'
import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url))
const temporaryRoot = fileURLToPath(new URL('../../../.tmp/stylelint-types/', import.meta.url))

/** 使用正式 TS7 CLI 检查消费代码，通过包名解析 dist 声明；类型错误保留退出状态与诊断。 */
async function checkConsumerTypes(source: string) {
  await mkdir(temporaryRoot, { recursive: true })
  const directory = await mkdtemp(`${temporaryRoot}/consumer-`)
  await writeFile(`${directory}/consumer.ts`, source)
  await writeFile(`${directory}/tsconfig.json`, JSON.stringify({
    // 使用 Node ESM 消费发布包，显式检查类型且不生成输出。
    compilerOptions: {
      module: 'NodeNext',
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    },
    // 只检查这次输入，避免读入其他测试和仓库配置。
    files: ['consumer.ts'],
  }))
  return execFileAsync(process.execPath, [
    compiler,
    '-p',
    directory,
    '--listFiles',
    '--pretty',
    'false',
  ])
}

describe('stylelint 发布入口', () => {
  it('通过包名加载 Stylelint 构建产物及公开导出', () => {
    expect(import.meta.resolve('@zzjtnb/stylelint-config')).toBe(new URL('../dist/index.mjs', import.meta.url).href)
    expect(Object.keys(stylelintConfigModule)).toEqual(['default', 'zzjtnb'])
  })

  it('消费方从正式包名获得 Stylelint 工厂、默认对象与 Config 类型', async () => {
    const result = await checkConsumerTypes(`
import type { Config } from '@zzjtnb/stylelint-config'

import defaults, { zzjtnb } from '@zzjtnb/stylelint-config'

// 包名解析必须读取发布声明，而非本仓库的源码 paths。
export const inherited: Config = defaults
export const configured: Config = zzjtnb({
  rules: { 'color-no-invalid-hex': true },
  overrides: [
    {
      files: ['**/*.scss'],
      rules: { 'scss/at-rule-no-unknown': true },
    },
  ],
})
`)
    expect(result.stdout.replaceAll('\\', '/')).toContain('/packages/stylelint/dist/index.d.mts')
  }, 30_000)

  it('发布的 Config 类型能拒绝无效参数，不借助类型禁用指令', async () => {
    await expect(checkConsumerTypes(`
      import type { Config } from '@zzjtnb/stylelint-config'
      export const invalid: Config = { extends: 123 }
    `)).rejects.toMatchObject({
      // TS7 类型检查失败退出 1，2322 表示 number 不能赋给 extends 的字符串 / 字符串数组类型。
      code: 1,
      stdout: expect.stringMatching(/consumer\.ts.*error TS2322:/),
    })
  }, 30_000)

  it('工厂参数直接遵循原生 Config，拒绝无效列表类型', async () => {
    await expect(checkConsumerTypes(`
      import { zzjtnb } from '@zzjtnb/stylelint-config'
      export default zzjtnb({ ignoreFiles: 123 })
    `)).rejects.toMatchObject({
      code: 1,
      stdout: expect.stringMatching(/consumer\.ts.*error TS2322:/),
    })
  }, 30_000)

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
    expect(stylelintConfig).toMatchObject({ allowEmptyInput: true })
  })

  it('消费方可以向 Stylelint 追加忽略项、规则和文件级覆盖', () => {
    const config = createStylelintConfig({
      ignoreFiles: ['generated/**'],
      rules: { 'no-empty-source': true },
      overrides: [
        {
          files: ['legacy/**/*.scss'],
          rules: { 'scss/at-rule-no-unknown': null },
        },
      ],
    })
    assert.ok(config.ignoreFiles)
    assert.ok(config.rules)
    assert.ok(config.overrides)
    expect(config.ignoreFiles).toContain('generated/**')
    expect(config.rules['no-empty-source']).toBe(true)
    expect(config.overrides.some(override => override.files.includes('legacy/**/*.scss'))).toBe(true)
  })
  it.each(['css', 'scss', 'vue', 'html'])('消费方可覆盖本项目规则，后续参数和文件例外按顺序生效：%s', async (extension) => {
    const style = '.Invalid_Name { color: red; }'
    const code = ['vue', 'html'].includes(extension)
      ? `<style>${style}</style>`
      : style
    for (const [config, expected] of [
      [
        createStylelintConfig(),
        true,
      ],
      [
        createStylelintConfig({
          rules: { 'selector-class-pattern': null },
        }),
        false,
      ],
      [
        createStylelintConfig(
          {
            rules: { 'selector-class-pattern': null },
          },
          {
            rules: { 'selector-class-pattern': '^[a-z]+$' },
          },
        ),
        true,
      ],
      [
        createStylelintConfig(
          {
            rules: { 'selector-class-pattern': '^[a-z]+$' },
          },
          {
            overrides: [
              {
                files: [`**/*.${extension}`],
                rules: { 'selector-class-pattern': null },
              },
            ],
          },
        ),
        false,
      ],
    ] as const) {
      const result = await stylelint.lint({ code, codeFilename: `consumer.${extension}`, config })
      expect(result.results[0]?.parseErrors).toEqual([])
      expect(result.results[0]?.warnings.some(warning => warning.rule === 'selector-class-pattern')).toBe(expected)
    }
  })
  it('消费方覆盖共享 CSS 文件规则后，不被共享 overrides 反向盖回', async () => {
    const disabled = createStylelintConfig({
      rules: { 'at-rule-prelude-no-invalid': null },
    })
    expect((await stylelint.resolveConfig('consumer.css', { config: disabled }))?.rules?.['at-rule-prelude-no-invalid']).toBeNull()
    const enabled = createStylelintConfig(
      {
        rules: { 'at-rule-prelude-no-invalid': null },
      },
      {
        rules: { 'at-rule-prelude-no-invalid': true },
      },
    )
    expect((await stylelint.resolveConfig('consumer.css', { config: enabled }))?.rules?.['at-rule-prelude-no-invalid']).toEqual([true])
  })
})
