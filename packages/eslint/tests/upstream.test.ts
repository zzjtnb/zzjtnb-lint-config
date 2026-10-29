/** 用当前上游的最终配置核对本包差异，避免升级后继续重复维护上游默认规则。 */
import antfu from '@antfu/eslint-config'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'

import { javascript } from '../src/configs/javascript'
import { stylistic } from '../src/configs/stylistic'
import { toml } from '../src/configs/toml'
import { plugins } from '../src/plugins'

it('本包语言规则只维护与上游不同的最终值', async () => {
  const options = { vue: true, typescript: true, pnpm: false } as const
  const upstream = new ESLint({ overrideConfigFile: true, overrideConfig: await antfu(options).toConfigs() })
  for (const [group, file, rules] of [
    ['javascript', 'sample.js', javascript],
    ['stylistic', 'sample.js', stylistic],
    ['toml', 'sample.toml', toml],
  ] as const) {
    const consumer = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await antfu({
        ...options,
        [group]: { overrides: rules },
      }, { plugins }).toConfigs(),
    })
    const base = await upstream.calculateConfigForFile(file)
    const configured = await consumer.calculateConfigForFile(file)
    for (const rule of Object.keys(rules ?? {})) {
      const actual = configured.rules[rule]
      const inherited = base.rules[rule]
      // 未配置和 off 都不运行该规则，不能把显式关闭误认为有效差异。
      expect(actual?.[0] === 0
        ? undefined
        : actual, `${group}: ${rule} 与上游重复`)
        .not
        .toEqual(inherited?.[0] === 0
          ? undefined
          : inherited)
    }
  }
}, 30_000)

it('node 规则与装饰器解析选项沿用上游默认', async () => {
  const { zzjtnb } = await import('../src/index')
  const options = { typescript: true, pnpm: false, vue: false } as const
  const upstream = new ESLint({ overrideConfigFile: true, overrideConfig: await antfu(options).toConfigs() })
  const consumer = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb(options) })
  const base = await upstream.calculateConfigForFile('source.ts')
  const configured = await consumer.calculateConfigForFile('source.ts')
  expect(Object.fromEntries(Object.entries(configured.rules).filter(([name]) => name.startsWith('node/'))))
    .toEqual(Object.fromEntries(Object.entries(base.rules).filter(([name]) => name.startsWith('node/'))))
  for (const option of ['experimentalDecorators', 'emitDecoratorMetadata']) {
    expect(configured.languageOptions.parserOptions[option]).toEqual(base.languageOptions.parserOptions[option])
  }
})

it('已移除的 Vue 覆盖沿用上游默认，消费方仍可调整', async () => {
  const { zzjtnb } = await import('../src/index')
  const options = { vue: true, pnpm: false } as const
  const upstream = new ESLint({ overrideConfigFile: true, overrideConfig: await antfu(options).toConfigs() })
  const consumer = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb(options) })
  const base = await upstream.calculateConfigForFile('component.vue')
  const configured = await consumer.calculateConfigForFile('component.vue')
  for (const rule of [
    'vue/html-closing-bracket-newline',
    'vue/singleline-html-element-content-newline',
    'vue/multiline-html-element-content-newline',
    'vue/no-extra-parens',
    'vue/one-component-per-file',
    'vue/require-default-prop',
    'vue/require-explicit-emits',
    'vue/v-on-event-hyphenation',
    'vue/attributes-order',
    'vue/html-indent',
    'vue/html-self-closing',
    'vue/attribute-hyphenation',
    'vue/no-reserved-component-names',
  ]) {
    expect(configured.rules[rule], rule).toEqual(base.rules[rule])
  }
  const custom = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb({
    ...options,
    vue: {
      overrides: { 'vue/attributes-order': 'off' },
    },
  }) })
  expect((await custom.calculateConfigForFile('component.vue')).rules['vue/attributes-order'][0]).toBe(0)
})

it('语法限制继承上游完整选择器，只将级别改为 warn', async () => {
  const { zzjtnb } = await import('../src/index')
  const options = { typescript: true, pnpm: false, vue: false } as const
  const upstream = new ESLint({ overrideConfigFile: true, overrideConfig: await antfu(options).toConfigs() })
  const consumer = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb(options) })
  const base = await upstream.calculateConfigForFile('source.ts')
  const actual = await consumer.calculateConfigForFile('source.ts')
  expect(actual.rules['no-restricted-syntax']).toEqual([
    1,
    ...base.rules['no-restricted-syntax'].slice(1),
  ])
  const [result] = await consumer.lintText('const enum State { Ready }\n', { filePath: 'source.ts' })
  expect(result?.messages.find(message => message.ruleId === 'no-restricted-syntax')?.severity).toBe(1)
})

it('只调整 JavaScript 默认级别时保留上游参数，消费方集成覆盖仍优先', async () => {
  const { zzjtnb } = await import('../src/index')
  const options = { pnpm: false, vue: false } as const
  const upstream = new ESLint({ overrideConfigFile: true, overrideConfig: await antfu(options).toConfigs() })
  const consumer = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb(options) })
  const base = await upstream.calculateConfigForFile('source.js')
  const actual = await consumer.calculateConfigForFile('source.js')
  expect(actual.rules['no-console']).toEqual([
    1,
    ...base.rules['no-console'].slice(1),
  ])
  const [result] = await consumer.lintText('console.warn(\'注意\')\n', { filePath: 'source.js' })
  expect(result?.messages.filter(message => message.ruleId === 'no-console')).toEqual([])
  const custom = new ESLint({ overrideConfigFile: true, overrideConfig: await zzjtnb({
    ...options,
    javascript: {
      overrides: {
        'no-console': [
          'error',
          {
            allow: ['info'],
          },
        ],
      },
    },
  }) })
  expect((await custom.calculateConfigForFile('source.js')).rules['no-console']).toEqual([
    2,
    {
      allow: ['info'],
    },
  ])
})
