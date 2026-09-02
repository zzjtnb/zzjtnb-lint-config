import type { Config } from 'stylelint'

import { utilityAtRules } from './constants.js'
import { stylelintScssAtRuleOptions } from './language.js'

/**
 * 共享 CSS / SCSS 规则。
 *
 * 规则按“语法兼容 → 框架函数 → 结构顺序 → 选择器”分组，单个规则旁边
 * 直接说明关闭或放宽的原因，避免消费方只能看到一个无法解释的规则映射。
 */
export const stylelintRules: NonNullable<Config['rules']> = {
  // 工具类框架和 SCSS 会扩展 at-rule 集合，避免核心规则误报合法语法。
  'at-rule-no-unknown': [true, {
    ignoreAtRules: utilityAtRules,
  }],

  // 当前 Stylelint 规则不再维护该废弃规则的兼容性检查，避免共享配置制造重复告警。
  'at-rule-no-deprecated': null,
  // 不强制通用字体族，由消费方的字体栈决定回退策略。
  'font-family-no-missing-generic-family-keyword': null,
  // 函数可由 CSS、SCSS 或消费方工具链扩展，不做全局未知函数限制。
  'function-no-unknown': null,
  // 不强制消费方改写现有 import 记法。
  'import-notation': null,
  // 允许项目继续使用兼容性更好的媒体查询范围写法。
  'media-feature-range-notation': null,
  // CSS Grid 的命名区域由组件布局约定维护，不在共享配置中重复推断。
  'named-grid-areas-no-invalid': null,
  // Vue/SCSS 嵌套语法的作用域由对应 parser 处理，关闭核心规则的重复检查。
  'nesting-selector-no-missing-scoping-root': null,
  // 不强制全局选择器按特殊性排序，避免破坏组件和工具类的既有覆盖关系。
  'no-descending-specificity': null,
  // 空源文件由构建入口决定是否合法，不让 Stylelint 阻塞占位样式文件。
  'no-empty-source': null,
  // 允许现代 CSS 和预处理器语法中的声明位置，不做跨语法的强制重排。
  'no-invalid-position-declaration': null,

  // 统一 at-rule / 声明 / 嵌套层级顺序；属性顺序由 recess preset 提供。
  'order/order': [
    [
      'dollar-variables',
      'custom-properties',
      'at-rules',
      'declarations',
      { name: 'supports', type: 'at-rule' },
      { name: 'media', type: 'at-rule' },
      { name: 'include', type: 'at-rule' },
      'rules',
    ],
    { severity: 'error' },
  ],

  // 同一层级的规则块之间保留空行，但不强制注释后的第一个嵌套节点添加空行。
  'rule-empty-line-before': ['always', {
    ignore: ['after-comment', 'first-nested'],
  }],

  // 允许常见的 BEM、状态和工具类前缀，同时保持可读命名。
  'selector-class-pattern': '^-?(?:(?:o|c|u|t|s|is|has|_|js|qa)-)?[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:[.+])?$',
  // 不强制把 `:not()` 改写为新的 Selectors 4 形式，兼容现有浏览器支持范围。
  'selector-not-notation': null,
  // Vue 和 CSS Modules 的伪类由框架/解析器提供，在标准 CSS 规则中显式声明。
  'selector-pseudo-class-no-unknown': [true, {
    ignorePseudoClasses: ['deep', 'global'],
  }],
  // Vue 的深度、全局和插槽伪元素不是标准 CSS，但在 SFC 中是合法语法。
  'selector-pseudo-element-no-unknown': [true, {
    ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
  }],

}

/**
 * 只在 SCSS 和 Vue SFC override 中注册的 SCSS 规则。
 *
 * Stylelint 的插件规则如果放在全局 `rules` 中，即使目标文件是普通 CSS，也会
 * 因为插件尚未加载而报告 Unknown rule。因此这些规则必须和对应的 SCSS preset
 * 放在同一个 override 作用域内，而不是依赖全局插件兜底。
 */
export const stylelintScssRules: NonNullable<Config['rules']> = {
  // SCSS 插件不读取 Stylelint 语言模型，因此复用统一的 at-rule 例外列表。
  'scss/at-rule-no-unknown': [true, stylelintScssAtRuleOptions],

  // 不限制 SCSS 运算符后的换行，避免干预计算表达式的可读排版。
  'scss/operator-no-newline-after': null,
}
