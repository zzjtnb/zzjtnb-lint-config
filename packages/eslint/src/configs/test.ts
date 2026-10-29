/** 测试导入规则的默认差异，作用范围与启用条件由 antfu 维护。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/** 同一仓库可同时使用 Vitest 与 Node.js 原生测试，不强制把 node:test 导入改成 Vitest。 */
export const test = { 'test/no-import-node-test': 'off' } satisfies NonNullable<TypedFlatConfigItem['rules']>
