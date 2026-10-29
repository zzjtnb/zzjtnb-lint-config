import stylelint from 'stylelint'
import { describe, expect, it } from 'vitest'

import { zzjtnb } from '../src/index'

async function check(code: string, filename: string) {
  const result = await stylelint.lint({
    code,
    codeFilename: filename,
    config: zzjtnb(),
    fix: true,
  })
  const file = result.results[0]!
  expect(file.parseErrors).toEqual([])
  expect(file.invalidOptionWarnings).toEqual([])
  return file.warnings
}

describe('stylelint 预设继承与语法边界', () => {
  it.each([
    'sample.css',
    'sample.scss',
    'sample.vue',
    'sample.html',
  ])('排序插件由预设注册，属性顺序与节点顺序都保持生效：%s', async (filename) => {
    const config = zzjtnb()
    expect(config.plugins).toEqual([])
    const css = '.card {\n  color: red;\n  display: flex;\n  --brand: red;\n}\n'
    const code = /\.(?:vue|html)$/.test(filename)
      ? `<style>${css}</style>`
      : css
    const result = await stylelint.lint({
      code,
      codeFilename: filename,
      config,
      fix: false,
    })
    expect(result.results[0]?.invalidOptionWarnings).toEqual([])
    const rules = result.results[0]?.warnings.map(warning => warning.rule)
    expect(rules).toContain('order/properties-order')
    expect(rules).toContain('order/order')
    const fixed = await stylelint.lint({
      code,
      codeFilename: filename,
      config,
      fix: true,
    })
    expect(fixed.results[0]?.warnings).toEqual([])
    expect(fixed.code).not.toBe(code)
  })

  it.each(['sample.scss', 'sample.vue'])('由官方 SCSS 预设关闭不适用的核心规则：%s', async (filename) => {
    const config = await stylelint.resolveConfig(filename, {
      config: zzjtnb(),
    })
    for (const rule of ['at-rule-no-unknown', 'at-rule-prelude-no-invalid']) {
      expect(zzjtnb().rules).not.toHaveProperty(rule)
      expect(config?.rules?.[rule]).toBeNull()
    }
  })

  it('消费方规则覆盖共享文件级规则，消费方文件级例外仍优先', async () => {
    const config = zzjtnb({
      rules: { 'scss/at-rule-no-unknown': null, 'at-rule-prelude-no-invalid': null },
      overrides: [
        {
          files: ['strict/**/*.css'],
          rules: { 'at-rule-prelude-no-invalid': true },
        },
      ],
    })
    const scss = await stylelint.resolveConfig('sample.scss', { config })
    expect(scss?.rules?.['scss/at-rule-no-unknown']).toBeNull()
    const css = await stylelint.resolveConfig('sample.css', { config })
    expect(css?.rules?.['at-rule-prelude-no-invalid']).toBeNull()
    const strict = await stylelint.resolveConfig('strict/sample.css', { config })
    expect(strict?.rules?.['at-rule-prelude-no-invalid']).toEqual([true])
  })

  it('普通 SCSS 不继承只处理 Vue 文件的容器预设', () => {
    const scss = zzjtnb().overrides?.find(item => item.files.includes('*.scss'))
    expect(scss?.extends).toHaveLength(1)
    expect(String(scss?.extends)).toContain('stylelint-config-recommended-scss')
  })

  it.each(['sample.scss', 'sample.vue'])('合法 Sass 参数与流程控制不触发核心 CSS 误报：%s', async (filename) => {
    const scss = `@mixin size($width) { width: $width; }
@function double($value) { @return $value * 2; }
%base { color: red; }
.card { @extend %base; @include size(double(2px)); }
@debug "example";
@warn "example";
@for $i from 1 through 2 { .item-#{$i} { width: $i * 1px; } }
@each $color in (red, blue) { .item-#{$color} { color: $color; } }
@if true { .active { color: red; } } @else { .inactive { color: blue; } }
`
    const code = filename.endsWith('.vue')
      ? `<style lang="scss">\n${scss}</style>`
      : scss
    expect(await check(code, filename)).toEqual([])
  })

  it.each([
    'sample.css',
    'sample.scss',
    'sample.vue',
    'sample.html',
  ])('tailwind v4 指令在各语法中一致生效：%s', async (filename) => {
    const css = `@config "./tailwind.config.js";
@plugin "example";
@reference "tailwindcss";
@source "./components";
@theme { --color-brand: #fff; }
@custom-variant dark (&:where(.dark, .dark *));
@utility content-auto { content-visibility: auto; }
.card { @apply p-4; @variant dark { color: white; } }
`
    const code = /\.(?:vue|html)$/.test(filename)
      ? `<style>\n${css}</style>`
      : css
    expect(await check(code, filename)).toEqual([])
  })

  it('cSS 标准指令仍严格校验参数，不把 Sass 语法登记成 CSS 扩展', async () => {
    const warnings = await check('@media 123 { .card { color: red; } }\n@mixin box($size) { width: $size; }', 'sample.css')
    expect(warnings.some(item => item.rule === 'at-rule-prelude-no-invalid')).toBe(true)
  })

  it.each(['sample.css', 'sample.scss', 'sample.vue'])('未知指令仍然报错：%s', async (filename) => {
    const css = '@unknown-directive value;'
    const code = filename.endsWith('.vue')
      ? `<style lang="scss">${css}</style>`
      : css
    const warnings = await check(code, filename)
    expect(warnings.some(item => item.rule?.endsWith('at-rule-no-unknown'))).toBe(true)
  })
})

it.each([
  ['inline.html', '<div style="width: 47%">内容</div>'],
  ['inline.vue', '<template><div style="width: 47%">内容</div></template>'],
])('合法内联声明不被位置规则误报，普通 CSS 非法声明仍检查：%s', async (filename, code) => {
  const config = zzjtnb()
  const inline = await stylelint.lint({
    code,
    codeFilename: filename,
    config,
    fix: false,
  })
  expect(inline.results.flatMap(result => result.warnings)).toEqual([])
  const invalid = await stylelint.lint({
    code: 'color: red;',
    codeFilename: 'invalid.css',
    config,
    fix: false,
  })
  expect(invalid.results[0]?.warnings.some(warning => warning.rule === 'no-invalid-position-declaration')).toBe(true)
})
