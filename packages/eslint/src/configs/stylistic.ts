/** 代码风格规则的默认差异，作用范围与启用条件由 antfu 维护。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'

export const stylistic = {
  // 链式调用换行不一致时警告，支持自动修复。
  'antfu/consistent-chaining': 'warn',
  // 列表换行不一致时警告，支持自动修复。
  'antfu/consistent-list-newline': 'warn',
  // 控制流大括号不符合上游约定时警告，支持自动修复。
  'antfu/curly': 'warn',
  // if 换行不符合上游约定时警告，支持自动修复。
  'antfu/if-newline': 'warn',
  // 顶层函数声明不符合上游约定时警告，支持自动修复。
  'antfu/top-level-function': 'warn',
} satisfies NonNullable<TypedFlatConfigItem['rules']>
