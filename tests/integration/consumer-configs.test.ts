import { execFile } from 'node:child_process'
import fs from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { ESLint } from 'eslint'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import stylelint from 'stylelint'
import { describe, expect, it, vi } from 'vitest'

import { zzjtnb } from '../../packages/eslint-config/src/index.js'
import { zzjtnb as createStylelintConfig } from '../../packages/stylelint-config/src/index.js'
import noTodoRule from '../fixtures/markdownlint/no-todo.js'
import { cliPath } from '../helpers/cli.js'

const markdownConfigPath = fileURLToPath(new URL('../../packages/markdownlint-config/index.jsonc', import.meta.url))
const markdownParsers = [jsoncParse]
const execFileAsync = promisify(execFile)
const markdownlintCli = cliPath('markdownlint-cli2')

describe('消费项目的 Markdownlint 配置', () => {
  it('共享 JSONC 规则保留用途说明和对应的官方文档链接', async () => {
    const source = fs.readFileSync(markdownConfigPath, 'utf8')
    const config = await readConfig(markdownConfigPath, markdownParsers)

    for (const name of Object.keys(config).filter(name => /^MD\d{3}$/.test(name))) {
      expect(source).toContain(`// ${name}：`)
      expect(source).toContain(`https://github.com/DavidAnson/markdownlint/blob/v0.42.0/doc/${name.toLowerCase()}.md`)
    }
  })

  it('消费方可以用 HTML 标签白名单覆盖共享默认值', async () => {
    const config = await readConfig(fileURLToPath(new URL('../fixtures/markdownlint/html-allowed.jsonc', import.meta.url)), markdownParsers)
    const result = await lint({
      config,
      strings: {
        'allowed.md': '<br>\n\n<details>\n<summary>说明</summary>\n</details>\n',
        'blocked.md': '<div>说明</div>\n',
      },
    })

    expect(result['allowed.md']).toEqual([])
    expect(result['blocked.md']?.some(error => error.ruleNames.includes('MD033'))).toBe(true)
  })

  it('允许长行、HTML 及不同章节下的同名小节', async () => {
    const result = await lint({
      config: await readConfig(markdownConfigPath, markdownParsers),
      strings: {
        'sample.md': `${'正文'.repeat(100)}\n\n<div>说明</div>\n\n## 第一部分\n\n### 示例\n\n## 第二部分\n\n### 示例\n`,
      },
    })

    expect(result['sample.md']).toEqual([])
  })

  it('仍会报告同级重复标题', async () => {
    const result = await lint({
      config: await readConfig(markdownConfigPath, markdownParsers),
      strings: { 'sample.md': '# 标题\n\n## 重复\n\n## 重复\n' },
    })

    expect(result['sample.md']?.filter(error => error.ruleNames.includes('MD024'))).toHaveLength(1)
  })

  it('原生 extends 允许消费方重新启用共享配置中关闭的规则', async () => {
    const config = await readConfig(fileURLToPath(new URL('../fixtures/markdownlint/line-length.jsonc', import.meta.url)), markdownParsers)
    const result = await lint({
      config,
      strings: { 'sample.md': `${'正文'.repeat(100)}\n` },
    })

    expect(result['sample.md']?.filter(error => error.ruleNames.includes('MD013'))).toHaveLength(1)
  })

  it('消费方可以按规则名关闭已加载的自定义规则', async () => {
    const result = await lint({
      config: {
        ...await readConfig(markdownConfigPath, markdownParsers),
        'project-no-todo': false,
      },
      customRules: [noTodoRule],
      strings: { 'sample.md': '# 说明\n\nTODO: 补充内容。\n' },
    })

    expect(result['sample.md']).toEqual([])
  })

  it('通过 CLI2 继承共享配置并加载项目自定义规则', async () => {
    const configPath = fileURLToPath(new URL('../fixtures/markdownlint/custom-rule.jsonc', import.meta.url))
    const completePath = fileURLToPath(new URL('../fixtures/markdownlint/complete.md', import.meta.url))
    const pendingPath = fileURLToPath(new URL('../fixtures/markdownlint/pending.md', import.meta.url))

    await execFileAsync(process.execPath, [
      markdownlintCli,
      '--config',
      configPath,
      completePath,
    ])
    await expect(execFileAsync(process.execPath, [
      markdownlintCli,
      '--config',
      configPath,
      pendingPath,
    ]))
      .rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('project-no-todo'),
      })
  }, 30_000)
})

describe('消费项目的 ESLint 配置', () => {
  it('实际检查 TypeScript 夹具而非仅保存示例文件', async () => {
    const fixture = new URL('../fixtures/eslint/valid.ts', import.meta.url)
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: false, vue: false }),
    })
    // 使用虚拟消费路径，避免测试夹具目录的忽略策略掩盖实际检查。
    const [result] = await eslint.lintText(fs.readFileSync(fixture, 'utf8'), { filePath: 'consumer.ts' })
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages).toEqual([])
  }, 30_000)

  // 首次加载完整语言插件并解析 Vue 文件需要更长的冷启动时间。
  it('允许在首个选项对象中关闭共享 Vue 规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        rules: { 'vue/require-default-prop': 'off' },
      }),
    })

    const config = await eslint.calculateConfigForFile('sample.vue')
    expect(config?.rules['vue/require-default-prop'][0]).toBe(0)

    const [result] = await eslint.lintText(
      '<script setup lang="ts">\ndefineProps<{ label?: string }>()\n</script>\n<template>\n  <span>{{ label }}</span>\n</template>\n',
      { filePath: 'sample.vue' },
    )
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages.filter(message => message.ruleId === 'vue/require-default-prop')).toEqual([])
  }, 30_000)

  it('自动修复时保留 TOML Schema 指令，其他语言仍检查注释空格', async () => {
    const directive = '#:schema https://developers.openai.com/codex/config-schema.json'
    const input = `${directive}\nmodel = "example"\n`
    const eslint = new ESLint({
      fix: true,
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: false, vue: false }),
    })

    const [result] = await eslint.lintText(input, { filePath: 'schema-example.toml' })
    expect(result?.fatalErrorCount).toBe(0)
    const output = result?.output ?? input
    expect(output.split('\n')[0]).toBe(directive)
    const [secondPass] = await eslint.lintText(output, { filePath: 'schema-example.toml' })
    expect(secondPass?.output ?? output).toBe(output)

    const [javascript] = await eslint.lintText('//example\nexport const value = 1\n', { filePath: 'schema-example.js' })
    expect(javascript?.output?.split('\n')[0]).toBe('// example')
  }, 30_000)

  it('允许覆盖 TOML 指令注释的默认规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        vue: false,
        rules: { 'toml/spaced-comment': 'error' },
      }),
    })

    const config = await eslint.calculateConfigForFile('sample.toml')
    expect(config?.rules['toml/spaced-comment'][0]).toBe(2)
  })

  it.each([
    ['javascript', 'sample.js', 'no-console'],
    ['vue', 'sample.vue', 'vue/require-default-prop'],
    ['toml', 'sample.toml', 'toml/spaced-comment'],
  ] as const)('保留上游 %s 选项中的规则覆盖优先级', async (language, filename, rule) => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        overrides: {
          [language]: { [rule]: 'error' },
        },
        ...(language === 'vue'
          ? {
              vue: {
                overrides: { [rule]: 'off' },
              },
            }
          : {}),
      }),
    })

    const config = await eslint.calculateConfigForFile(filename)
    expect(config?.rules[rule][0]).toBe(language === 'vue'
      ? 0
      : 2)
  })

  it('语言对象覆盖高于 overrides 分组，首参 rules 高于语言对象覆盖', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        overrides: {
          vue: { 'vue/require-default-prop': 'error' },
          toml: { 'toml/spaced-comment': 'error' },
        },
        vue: {
          overrides: { 'vue/require-default-prop': 'off' },
        },
        toml: {
          overrides: { 'toml/spaced-comment': 'off' },
        },
        rules: { 'vue/require-default-prop': 'warn' },
      }),
    })

    const vue = await eslint.calculateConfigForFile('sample.vue')
    expect(vue?.rules['vue/require-default-prop'][0]).toBe(1)
    const toml = await eslint.calculateConfigForFile('sample.toml')
    expect(toml?.rules['toml/spaced-comment'][0]).toBe(0)
  })

  it('没有 pnpm-workspace.yaml 的项目默认不启用 pnpm 集成，仍能检查 package.json', async () => {
    // 判断依据是向上查找工作区文件，必须在仓库之外的临时目录验证，仓库自身存在该文件。
    const directory = await mkdtemp(join(tmpdir(), 'lint-npm-consumer-'))
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory)
    try {
      const config = await zzjtnb()
      const eslint = new ESLint({ cwd: directory, overrideConfigFile: true, overrideConfig: config })
      const resolved = await eslint.calculateConfigForFile(join(directory, 'package.json'))
      expect(Object.keys(resolved?.rules ?? {}).filter(name => name.startsWith('pnpm/'))).toEqual([])

      const [result] = await eslint.lintText('{\n  "name": "npm-consumer",\n  "version": "1.0.0"\n}\n', {
        filePath: join(directory, 'package.json'),
      })
      expect(result?.fatalErrorCount).toBe(0)
      expect(result?.messages.filter(message => message.ruleId?.startsWith('pnpm/'))).toEqual([])
    }
    finally {
      cwd.mockRestore()
      await rm(directory, { force: true, recursive: true })
    }
  }, 30_000)

  it('后续 Flat Config 片段仍可覆盖首个选项对象中的规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb(
        {
          pnpm: false,
          rules: { 'vue/require-default-prop': 'off' },
        },
        {
          files: ['**/*.vue'],
          rules: { 'vue/require-default-prop': 'error' },
        },
      ),
    })

    const config = await eslint.calculateConfigForFile('sample.vue')
    expect(config?.rules['vue/require-default-prop'][0]).toBe(2)
  })
})

describe('消费项目的 Stylelint 配置', () => {
  it('消费方示例使用原生 Stylelint 布尔值重新启用空源文件检查', async () => {
    const result = await stylelint.lint({
      code: '',
      codeFilename: 'consumer.css',
      config: createStylelintConfig({
        rules: { 'no-empty-source': true },
      }),
    })
    expect(result.results[0]?.invalidOptionWarnings).toEqual([])
    expect(result.results[0]?.warnings.some(warning => warning.rule === 'no-empty-source')).toBe(true)
  })

  it('实际检查 SCSS 夹具中的 Sass、工具类指令和主题函数', async () => {
    const fixture = new URL('../fixtures/stylelint/utilities.scss', import.meta.url)
    const result = await stylelint.lint({
      code: fs.readFileSync(fixture, 'utf8'),
      codeFilename: 'consumer.scss',
      config: createStylelintConfig(),
      fix: true,
    })
    expect(result.results[0]?.parseErrors).toEqual([])
    expect(result.results[0]?.warnings).toEqual([])
    expect(result.errored).toBe(false)
  })

  it.each(['sample.css', 'sample.scss'])('共享默认值已覆盖工具类指令和 rpx：%s', async (codeFilename) => {
    const result = await stylelint.lint({
      code: `@custom-variant dark (&:where(.dark, .dark *));
@theme { --color-primary: #fff; }
@layer utilities { .layer { color: red; } }
@screen lg { .screen { color: red; } }
@variants hover { .variant { color: red; } }
@responsive { .responsive { color: red; } }
.sample { @apply p-4; width: 10rpx; }`,
      codeFilename,
      config: createStylelintConfig(),
      fix: true,
    })

    expect(result.results[0]?.parseErrors).toEqual([])
    expect(result.results[0]?.warnings).toEqual([])
    expect(result.errored).toBe(false)
  })

  it('工具类指令例外不会关闭标准指令的参数校验', async () => {
    const result = await stylelint.lint({
      code: '@media 123 { .sample { color: red; } }',
      codeFilename: 'sample.css',
      config: createStylelintConfig(),
      fix: true,
    })

    expect(result.results[0]?.warnings.filter(warning => warning.rule === 'at-rule-prelude-no-invalid')).toHaveLength(1)
  })

  it('允许 rpx 时仍会报告拼写错误的单位', async () => {
    const result = await stylelint.lint({
      code: '.sample { width: 10rpz; }',
      codeFilename: 'sample.css',
      config: createStylelintConfig(),
      fix: false,
    })

    expect(result.results[0]?.warnings.filter(warning => warning.rule === 'declaration-property-value-no-unknown')).toHaveLength(1)
  })

  it('允许 Vue scoped 样式使用插槽伪类', async () => {
    const result = await stylelint.lint({
      code: '<style scoped>\n:slotted(.sample) {\n  color: red;\n}\n</style>',
      codeFilename: 'sample.vue',
      config: createStylelintConfig(),
      fix: false,
    })

    expect(result.results[0]?.parseErrors).toEqual([])
    expect(result.results[0]?.warnings.filter(warning => warning.rule === 'selector-pseudo-class-no-unknown')).toEqual([])
  })

  it('sCSS 的 Sass 指令不被核心规则误报：带参数的 mixin、include、function，以及 extend、debug、else', async () => {
    const result = await stylelint.lint({
      code: [
        '@function double($value) {',
        '  @return $value * 2;',
        '}',
        '',
        '@mixin box($size) {',
        '  width: $size;',
        '}',
        '',
        '%base {',
        '  color: red;',
        '}',
        '',
        '.card {',
        '  @extend %base;',
        '',
        '  @include box(double(2px));',
        '}',
        '',
        '$theme: dark;',
        '',
        '@if $theme == dark {',
        '  .a {',
        '    color: black;',
        '  }',
        '} @else {',
        '  .a {',
        '    color: white;',
        '  }',
        '}',
        '',
        '@debug "done";',
        '',
      ].join('\n'),
      codeFilename: 'sample.scss',
      config: createStylelintConfig(),
    })

    expect(result.results[0]?.parseErrors).toEqual([])
    expect(result.results[0]?.warnings).toEqual([])
  })

  it('sCSS 与 CSS 中真正未知的指令仍会被报告', async () => {
    const [scss, css] = await Promise.all([
      stylelint.lint({
        code: '@unknown-directive foo;\n',
        codeFilename: 'sample.scss',
        config: createStylelintConfig(),
      }),
      stylelint.lint({
        code: '@unknown-directive foo;\n',
        codeFilename: 'sample.css',
        config: createStylelintConfig(),
      }),
    ])

    expect(scss.results[0]?.warnings.map(warning => warning.rule)).toContain('scss/at-rule-no-unknown')
    expect(css.results[0]?.warnings.map(warning => warning.rule)).toContain('at-rule-no-unknown')
  })

  it('仍会报告拼写错误的伪类', async () => {
    const result = await stylelint.lint({
      code: '<style scoped>\n:unknown-slot(.sample) {\n  color: red;\n}\n</style>',
      codeFilename: 'sample.vue',
      config: createStylelintConfig(),
      fix: false,
    })

    expect(result.results[0]?.warnings.filter(warning => warning.rule === 'selector-pseudo-class-no-unknown')).toHaveLength(1)
  })
})
