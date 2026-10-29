import process from 'node:process'

import stylelint from 'stylelint'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createIgnorePatterns } from '../src/configs/ignores'
import { zzjtnb } from '../src/index'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('stylelint 工厂配置隔离', () => {
  it('语言模型的嵌套列表独立，第三方 parser 实例仍复用', () => {
    const first = zzjtnb()
    const second = zzjtnb()
    const units = first.languageOptions!.syntax!.units!.length!
    units.push('example-unit')
    expect(second.languageOptions!.syntax!.units!.length).toEqual(['rpx'])
    const parser = (config: typeof first) => config.overrides!.find(item => item.files.includes('*.html'))!.customSyntax
    expect(parser(first)).toBe(parser(second))
  })

  it('修改一次调用返回的文件级规则，不污染后续调用', () => {
    const first = zzjtnb()
    const css = first.overrides!.find(item => item.files.includes('*.css'))!
    const original = css.rules!['at-rule-prelude-no-invalid']
    try {
      css.rules!['at-rule-prelude-no-invalid'] = null
      const second = zzjtnb()
      const next = second.overrides!.find(item => item.files.includes('*.css'))!
      expect(next.rules!['at-rule-prelude-no-invalid']).toEqual(original)
    }
    finally {
      css.rules!['at-rule-prelude-no-invalid'] = original
    }
  })
})

describe('stylelint 消费项目的忽略范围', () => {
  it('沿用引擎的 node_modules 默认忽略，不在共享列表重复声明', async () => {
    const config = zzjtnb()
    expect(createIgnorePatterns().some(pattern => pattern.includes('node_modules'))).toBe(false)
    const ignored = await stylelint.lint({
      code: '.card { color: #GGG; }',
      codeFilename: `${process.cwd()}/node_modules/example/styles.css`,
      config,
    })
    expect(ignored.results).toEqual([])
    const included = await stylelint.lint({
      code: '.card { color: #GGG; }',
      codeFilename: `${process.cwd()}/src/styles.css`,
      config,
    })
    expect(included.results[0]?.warnings.some(warning => warning.rule === 'declaration-property-value-no-unknown')).toBe(true)
  })

  it('工厂按本次调用的工作目录创建忽略项，不沿用模块导入时的目录', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/example/second-project')
    const config = zzjtnb()
    expect(config.ignoreFiles).toContain('/example/second-project/**/dist/**')
    const result = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: '/example/second-project/dist/index.css',
      config,
    })
    expect(result.results[0]?.ignored).toBe(true)
  })

  it.each(['/example/project[demo]', '/example/project(test)', '/example/project!name'])('工作目录含 glob 字符时仍忽略本项目的产物：%s', async (cwd) => {
    vi.spyOn(process, 'cwd').mockReturnValue(cwd)
    const result = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: `${cwd}/dist/index.css`,
      config: zzjtnb(),
    })
    expect(result.results[0]?.ignored).toBe(true)
  })

  it.each([
    ['.nuxt/styles.css', true],
    ['.wrangler/styles.css', true],
    ['releases/styles.css', true],
    ['backup/styles.css', true],
    ['.codegraph/styles.css', true],
    ['nested/.codegraph/styles.css', true],
    ['.tmp/styles.css', true],
    ['.git/styles.css', true],
    ['nested/.git/styles.css', true],
    ['.cache/styles.css', true],
    ['nested/.cache/styles.css', true],
    ['.output/styles.css', true],
    ['nested/.output/styles.css', true],
    ['nested/.tmp/styles.css', true],
    ['src/tmp/styles.css', false],
    ['nested/backup/styles.css', true],
    ['playwright-report/index.html', true],
    ['nested/playwright-report/assets/report.css', true],
    ['test-results/example/attachment.css', true],
    ['nested/test-results/example/index.html', true],
    ['src/playwright-report-card.css', false],
    ['src/backup-card.css', false],
    ['src-tauri/target/release/bundle/app/resources/styles.css', true],
    ['src-tauri/target/aarch64-apple-darwin/release/resources/styles.css', true],
    ['target/release/bundle/app/resources/styles.css', false],
    ['src-tauri/gen/schemas/desktop-schema.json', true],
    ['src-tauri/gen/android/app/src/main/assets/styles.css', true],
    ['src-tauri/gen/apple/Resources/styles.css', true],
    ['gen/styles.css', false],
    ['target/styles.css', false],
    ['src-tauri/resources/styles.css', true],
    ['src/styles.css', false],
  ])('默认忽略通用输出与整个 Tauri 目录：%s', async (path, ignored) => {
    vi.spyOn(process, 'cwd').mockReturnValue('/example/tauri-app')
    const result = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: `/example/tauri-app/${path}`,
      config: zzjtnb(),
    })
    expect(result.results[0]?.ignored === true).toBe(ignored)
  })

  it('不会把含方括号的项目名当成字符集合，误忽略另一个项目', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue('/example/project[demo]')
    const result = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: '/example/projectd/dist/index.css',
      config: zzjtnb(),
    })
    expect(result.results[0]?.ignored).not.toBe(true)
  })

  it('文件系统根目录不产生重复分隔符', () => {
    expect(createIgnorePatterns('/', ['**/dist/**'])).toEqual(['/**/dist/**'])
    expect(createIgnorePatterns('C:\\', ['**/dist/**'])).toEqual(['C:/**/dist/**'])
  })
})
