import { expect, it } from 'vitest'
import { describeConfig } from '../../../sandbox/config'

it('配置展示保留插件、语言选项与处理器，不丢失非规则配置', () => {
  const result = describeConfig({
    name: 'language/setup',
    files: ['**/*.ts'],
    ignores: ['**/generated/**'],
    plugins: {
      sample: { rules: {} },
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: {
        meta: { name: 'sample-parser', version: '1' },
        parse() { return {} as never },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    settings: {
      sample: { enabled: true },
    },
    processor: 'sample/processor',
    rules: { eqeqeq: 'error' },
  }, 3)
  expect(result.index).toBe(4)
  expect(result.plugins).toEqual(['sample'])
  expect(result.languageOptions?.parser).toEqual({ name: 'sample-parser', version: '1' })
  expect(result.linterOptions?.reportUnusedDisableDirectives).toBe('error')
  expect(result.processor).toBe('sample/processor')
  expect(JSON.stringify(result)).not.toContain('function')
})
