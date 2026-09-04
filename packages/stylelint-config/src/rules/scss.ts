import type { Config } from 'stylelint'

import { utilityAtRules } from '../configs/syntax.js'

/**
 * 只在 SCSS 和 Vue SFC override 中注册的 SCSS 规则。
 *
 * Stylelint 的插件规则如果放在全局 `rules` 中，即使目标文件是普通 CSS，也会
 * 因为插件尚未加载而报告 Unknown rule。因此这些规则必须和对应的 SCSS preset
 * 放在同一个 override 作用域内，而不是依赖全局插件兜底。
 *
 * Sass 指令（`@mixin`、`@include`、`@extend`、`@each`、`@use` 等）和 SCSS 语法的核心规则调整
 * 由官方预设负责，这里只补预设没有覆盖的部分。
 */
export const scssRules: NonNullable<Config['rules']> = {
  // SCSS 插件不读取 Stylelint 语言模型，因此复用统一的工具类指令例外列表。
  'scss/at-rule-no-unknown': [
    true,
    { ignoreAtRules: utilityAtRules },
  ],
  // 沿用标准预设的空行约定；Sass 的 `@else` 必须紧跟上一个 `}`，不能要求它前面有空行。
  'at-rule-empty-line-before': [
    'always',
    {
      except: ['blockless-after-same-name-blockless', 'first-nested'],
      ignore: ['after-comment'],
      ignoreAtRules: ['else'],
    },
  ],

  // 不限制 SCSS 运算符后的换行，避免干预计算表达式的可读排版。
  'scss/operator-no-newline-after': null,
}
