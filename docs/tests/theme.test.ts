import { readFileSync } from 'node:fs'

import ts from 'typescript'
import { createMarkdownRenderer } from 'vitepress'
import { groupIconMdPlugin } from 'vitepress-plugin-group-icons'
import { describe, expect, it } from 'vitest'

const theme = new URL('../.vitepress/theme/index.ts', import.meta.url)

describe('官方默认主题扩展', () => {
  it('继承 DefaultTheme，样式入口实际存在，不保留失效的自建布局', () => {
    const source = ts.createSourceFile('index.ts', readFileSync(theme, 'utf8'), ts.ScriptTarget.ESNext, true)
    const imports = source.statements.filter(ts.isImportDeclaration).map(node => (node.moduleSpecifier as ts.StringLiteral).text)
    expect(imports).toContain('vitepress/theme')
    expect(imports).toContain('virtual:group-icons.css')
    for (const path of imports.filter(path => path.endsWith('.scss')))
      expect(readFileSync(new URL(path, theme), 'utf8').length).toBeGreaterThan(0)
    const exported = source.statements.find(ts.isExportAssignment)!
    const value = exported.expression as ts.SatisfiesExpression
    const settings = value.expression as ts.ObjectLiteralExpression
    const inheritance = settings.properties.find(property => property.name?.getText(source) === 'extends') as ts.PropertyAssignment
    expect(inheritance.initializer.getText(source)).toBe('DefaultTheme')
    expect(settings.properties.some(property => property.name?.getText(source) === 'Layout')).toBe(false)
  })

  it('正式 Markdown 插件保留代码组和两个可选配置示例', async () => {
    const renderer = await createMarkdownRenderer(new URL('../src/', import.meta.url).pathname, {
      config(md) {
        md.use(groupIconMdPlugin)
      },
    })
    const html = renderer.render('::: code-group\n\n```ts [eslint.config.ts]\nexport default {}\n```\n\n```json [package.json]\n{}\n```\n\n:::\n')
    expect(html).toContain('vp-code-group')
    expect(html).toContain('eslint.config.ts')
    expect(html).toContain('package.json')
  })

  it('自定义样式限定外部徽章图片为行内排列，保留普通正文图片边距', () => {
    const scss = readFileSync(new URL('../.vitepress/theme/styles/custom.scss', import.meta.url), 'utf8')
    expect(scss).toContain('.vp-doc a > img:is([src^=\'https://npmx.dev/api/registry/badge/\'], [src^=\'https://img.shields.io/\'])')
    expect(scss).toContain('display: inline-block;')
  })
})
