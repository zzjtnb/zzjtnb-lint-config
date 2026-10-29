import { describe, expect, it } from 'vitest'
import { changeLevel as eslint } from '../../stores/config/editing/eslint'
import { changeLevel as markdownlint } from '../../stores/config/editing/markdownlint'
import { factoryOptions, setFactoryOption } from '../../stores/config/editing/options'
import { changeLevel as stylelint } from '../../stores/config/editing/stylelint'

describe('方案中的可视化配置边界', () => {
  it('只修改正式工厂的布尔开关，保留注释和其他表达式', () => {
    const source = 'import { zzjtnb as create } from \'@zzjtnb/eslint-config\'\nexport default create({ /* 注释 */ markdown: false, rules: customRules })'
    const result = setFactoryOption(source, 'markdown', true)
    expect(result).toBe(source.replace('markdown: false', 'markdown: true'))
    expect(setFactoryOption(result, 'vue', false)).toContain('vue: false,  /* 注释 */')
    expect(factoryOptions(result, 'eslint').find(item => item.key === 'markdown')?.value).toBe(true)
  })
  it.each(['zzjtnb(settings)', 'zzjtnb({ ...settings })', 'zzjtnb({ vue: chooseVue() })'])('动态选项不被无损表单假象覆盖：%s', (expression) => {
    const source = `import { zzjtnb } from '@zzjtnb/eslint-config';export default ${expression}`
    expect(factoryOptions(source, 'eslint').find(item => item.key === 'vue')?.editable).toBe(false)
    expect(() => setFactoryOption(source, 'vue', true)).toThrow()
  })
  it('不同工具的参数与级别不共用 ESLint 数组语义', () => {
    expect(eslint(['error', 'always'], 'warn')).toEqual(['warn', 'always'])
    expect(stylelint([
      'short',
      { disableFix: true },
    ], 'warn')).toEqual([
      'short',
      { disableFix: true, severity: 'warning' },
    ])
    expect(stylelint(null, 'off')).toBeNull()
    expect(() => stylelint(null, 'error')).toThrow('主参数')
    expect(markdownlint({ line_length: 80 }, 'error')).toEqual({ line_length: 80 })
    expect(markdownlint({}, 'off')).toBe(false)
    expect(() => markdownlint(true, 'warn')).toThrow()
  })
})
