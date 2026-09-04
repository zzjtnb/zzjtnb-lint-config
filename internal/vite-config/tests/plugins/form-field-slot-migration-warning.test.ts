import type { ResolvedConfig } from 'vite'

import assert from 'node:assert/strict'

import { describe, expect, it, vi } from 'vitest'

import {
  FORM_FIELD_SLOT_MIGRATION_WARNING,
  viteFormFieldSlotMigrationWarningPlugin,
} from '../../src/plugins/form-field-slot-migration-warning'

describe('表单字段插槽迁移警告插件', () => {
  it('在开发服务中警告并向浏览器注入同一消息', () => {
    const plugin = viteFormFieldSlotMigrationWarningPlugin()
    const warning = vi.fn()

    expect(plugin.apply).toBe('serve')
    assert.ok(typeof plugin.configResolved === 'function', '必须提供开发服务配置钩子')

    Reflect.apply(plugin.configResolved, undefined, [
      {
        logger: { warn: warning },
      } as unknown as ResolvedConfig,
    ])

    expect(warning).toHaveBeenCalledOnce()
    expect(warning).toHaveBeenCalledWith(FORM_FIELD_SLOT_MIGRATION_WARNING)
    assert.ok(typeof plugin.transformIndexHtml === 'function', '必须提供浏览器警告注入钩子')

    const result = Reflect.apply(plugin.transformIndexHtml, undefined, [
      '',
      {} as never,
    ])

    expect(result).toEqual([
      {
        attrs: {
          'data-form-field-slot-migration-warning': '',
        },
        children: `console.warn(${JSON.stringify(FORM_FIELD_SLOT_MIGRATION_WARNING)});`,
        injectTo: 'body',
        tag: 'script',
      },
    ])
    expect(FORM_FIELD_SLOT_MIGRATION_WARNING).toContain('`v-bind="slotProps"`')
    expect(FORM_FIELD_SLOT_MIGRATION_WARNING).toContain(
      '`v-bind="slotProps.componentProps"`',
    )
  })
})
