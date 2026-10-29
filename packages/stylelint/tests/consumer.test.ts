import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

import { zzjtnb as createStylelintConfig } from '../src/index'

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

  it('检查 Sass、工具类指令和主题函数', async () => {
    const result = await stylelint.lint({
      code: '@use \'sass:math\';\n\n.fixture {\n  @apply p-4 rounded-lg;\n\n  width: math.div(10px, 2);\n  color: theme(\'colors.gray.900\');\n}\n',
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
