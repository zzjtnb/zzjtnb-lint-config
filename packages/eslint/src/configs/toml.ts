/** TOML Schema 注释的默认差异，作用范围与启用条件由 antfu 维护。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'

export const toml = {
  // 保留 #:schema 中相邻的 # 与 :，避免插件自动插入空格。
  // https://ota-meshi.github.io/eslint-plugin-toml/rules/spaced-comment.html
  'toml/spaced-comment': 'off',
} satisfies NonNullable<TypedFlatConfigItem['rules']>
