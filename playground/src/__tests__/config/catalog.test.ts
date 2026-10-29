import type { RuleItem, ToolMetadata } from '../../../types'
import { createPinia, setActivePinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import { useConfigStore } from '../../stores/config/index'

it('完整规则定义独立于当前文件，其他文件的配置值不能冒充当前值', async () => {
  setActivePinia(createPinia())
  const definition: RuleItem = {
    name: 'first',
    category: 'test',
    description: '第一条规则',
    files: 'other.vue',
    configured: true,
    status: 'error',
    value: '"error"',
    sources: [],
  }
  const extra: RuleItem = {
    ...definition,
    name: 'other/rule',
    schema: [
      { type: 'boolean' },
    ],
  }
  const fetcher = vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith('catalog.json')
    ? {
        rules: [definition, extra],
      }
    : {
      mode: 'eslint',
      filename: url.endsWith('component.vue.json')
        ? 'component.vue'
        : 'module.ts',
      version: 'test',
      configs: [],
      rules: [
        {
          ...definition,
          files: 'module.ts',
          value: '"warn"',
          status: 'warn',
        },
      ],
    } satisfies ToolMetadata)))
  vi.stubGlobal('fetch', fetcher)
  const config = useConfigStore()
  await config.load()
  expect(config.rules.map(rule => rule.name)).toEqual(['first', 'other/rule'])
  expect(config.rules[0]?.status).toBe('warn')
  expect(config.rules[1]).toMatchObject({
    configured: false,
    status: 'off',
    value: 'null',
    schema: extra.schema,
  })
  config.draft.filename = 'component.vue'
  await vi.waitFor(() => expect(config.metadata?.filename).toBe('component.vue'))
  expect(config.rules).toHaveLength(2)
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith('catalog.json'))).toHaveLength(1)
  vi.unstubAllGlobals()
})
