import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/**
 * TOML 指令注释的默认差异，由 antfu TOML 覆盖入口消费。
 *
 * 允许顶部使用 `#:schema <url>`，避免插入空格导致编辑器无法识别。
 * 启用条件、文件作用域与消费方覆盖沿用上游，不另加匹配 TOML 文件的全局片段。
 */
export const tomlRules = {
  // #:schema 的 # 与 : 必须相邻，关闭通用规则以防自动插入空格。
  // https://eslint.org/docs/latest/rules/spaced-comment
  'spaced-comment': 'off',
  // TOML 插件也会检查注释空格，需要同时关闭，保留编辑器可识别的完整指令。
  // https://ota-meshi.github.io/eslint-plugin-toml/rules/spaced-comment.html
  'toml/spaced-comment': 'off',
} satisfies TypedFlatConfigItem['rules']
