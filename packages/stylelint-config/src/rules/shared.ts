import type { Config } from 'stylelint'

/**
 * 全部文件类型共用的规则。
 *
 * 规则按“语法兼容 → 框架函数 → 选择器”分组，单个规则旁边
 * 直接说明关闭或放宽的原因，避免消费方只能看到一个无法解释的规则映射。
 *
 * 这里不要重新开启官方 SCSS / Vue 预设已经关闭的规则（例如 `at-rule-no-unknown`、
 * `at-rule-prelude-no-invalid`）：Stylelint 中顶层 `rules` 的优先级高于 override 里
 * 继承的预设，写在这里会抵消预设对 SCSS 的关闭，造成合法 Sass 语法被误报。
 * 只适用于某类文件的规则，放到 `overrides` 对应的作用域内。
 */
export const sharedRules: NonNullable<Config['rules']> = {
  // 允许消费方保留既有 at-rule 写法，不在共享策略中强制迁移废弃指令。
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
  // 保留共享配置对嵌套写法的宽松约定；parser 只负责解析，不代替规则验证。
  'nesting-selector-no-missing-scoping-root': null,
  // 不强制全局选择器按特殊性排序，避免破坏组件和工具类的既有覆盖关系。
  'no-descending-specificity': null,
  // 空源文件由构建入口决定是否合法，不让 Stylelint 阻塞占位样式文件。
  'no-empty-source': null,
  // 允许现代 CSS 和预处理器语法中的声明位置，不做跨语法的强制重排。
  'no-invalid-position-declaration': null,

  // 同一层级的规则块之间保留空行，但不强制注释后的第一个嵌套节点添加空行。
  'rule-empty-line-before': [
    'always',
    {
      ignore: ['after-comment', 'first-nested'],
    },
  ],

  // 允许常见的 BEM、状态和工具类前缀，同时保持可读命名。
  'selector-class-pattern': '^-?(?:(?:o|c|u|t|s|is|has|_|js|qa)-)?[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*(?:__[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:--[a-zA-Z0-9]+(?:-[a-zA-Z0-9]+)*)?(?:[.+])?$',
  // 不强制把 `:not()` 改写为新的 Selectors 4 形式，兼容现有浏览器支持范围。
  'selector-not-notation': null,
  // Vue 的深度、全局和插槽伪类由 SFC 编译器处理，CSS Modules 也允许 global。
  'selector-pseudo-class-no-unknown': [
    true,
    {
      ignorePseudoClasses: ['deep', 'global', 'slotted'],
    },
  ],
  // Vue 的深度、全局和插槽伪元素不是标准 CSS，但在 SFC 中是合法语法。
  'selector-pseudo-element-no-unknown': [
    true,
    {
      ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
    },
  ],
}
