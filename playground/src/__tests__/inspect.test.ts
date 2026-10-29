import { describe, expect, it } from 'vitest'

import { inspect as eslint } from '../../scripts/lib/eslint'
import { inspect as markdownlint } from '../../scripts/lib/markdownlint'
import { inspect as stylelint } from '../../scripts/lib/stylelint'
import { configurations } from '../stores/config/catalog'

const inspectors = { eslint, stylelint, markdownlint }

describe('静态配置快照', () => {
  it('从实际核心规则取得说明、可修复属性和来源序号', async () => {
    const data = await eslint('module.ts')
    const rule = data.rules.find(item => item.name === 'array-callback-return')!
    expect(rule.description).toContain('callback')
    expect(rule.configured).toBe(true)
    expect(rule.sources.length).toBeGreaterThan(0)
    expect(rule.sources.every(source => source.index > 0 && source.name.length > 0)).toBe(true)
    expect(data.rules.find(item => item.name === 'eqeqeq')?.fixable).toBe(true)
    expect(data.rules.some(item => !item.configured)).toBe(true)
    expect(data.configs.some(item => item.files.length > 0)).toBe(true)
  })

  it('收集 Stylelint 核心和实际加载的插件定义', async () => {
    const data = await stylelint('stylesheet.scss')
    expect(data.rules.find(rule => rule.name === 'color-hex-length')?.fixable).toBe(true)
    expect(data.rules.find(rule => rule.name === 'scss/at-rule-no-unknown')?.url).toContain('stylelint-scss')
    expect(data.rules.some(rule => rule.category === 'order')).toBe(true)
    expect(data.rules.find(rule => rule.name === 'at-rule-no-unknown')?.status).toBe('off')
  })

  it('markdownlint 保留正式规则说明和共享配置', async () => {
    const data = await markdownlint('document.md')
    expect(data.rules.length).toBeGreaterThan(40)
    expect(data.rules.find(rule => rule.name === 'MD001')?.description).toBeTruthy()
    expect(data.configs[0]?.name).toBe('@zzjtnb/markdownlint-config')
  })

  it.each(Object.entries(configurations).flatMap(([mode, config]) => config.targets.map(example => [mode, example.filename] as const)))('%s/%s 可被真实引擎解析', async (mode, filename) => {
    const data = await inspectors[mode as keyof typeof configurations](filename)
    expect(data.filename).toBe(filename)
    expect(data.rules.length).toBeGreaterThan(0)
    expect(() => JSON.stringify(data)).not.toThrow()
  })
})
