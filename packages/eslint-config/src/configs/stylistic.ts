import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/**
 * 注入 antfu stylistic 覆盖入口的默认差异。
 *
 * 由上游决定启用条件、文件作用域和后置豁免；不要把它们重新追加为全局规则。
 * 本包没有改变的上游规则（包括 v10 新增规则）继续采用上游默认值。
 */
export const stylisticRules = {
  // 不额外限制链式调用的换行方式。
  'antfu/consistent-chaining': 'off',
  // 不额外限制列表的换行方式。
  'antfu/consistent-list-newline': 'off',
  // 不强制控制流语句使用大括号。
  'antfu/curly': 'off',
  // 不额外限制 if 条件的换行方式。
  'antfu/if-newline': 'off',
  // 不额外限制顶层函数的声明风格。
  'antfu/top-level-function': 'off',
} satisfies TypedFlatConfigItem['rules']
