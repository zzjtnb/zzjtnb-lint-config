/** 所有样式语法共用的规则差异，不包含只对 CSS 或 SCSS 合法的配置。 */
import type { Config } from 'stylelint'

/**
 * 全部文件类型共用的规则。
 *
 * 规则覆盖语法兼容、声明和选择器，单个规则旁边
 * 直接说明关闭或放宽的原因，避免消费方只能看到一个无法解释的规则映射。
 *
 * 这里不要重新开启官方 SCSS / Vue 预设已经关闭的规则（例如 `at-rule-no-unknown`、
 * `at-rule-prelude-no-invalid`）：Stylelint 中顶层 `rules` 的优先级高于 override 里
 * 继承的预设，写在这里会抵消预设对 SCSS 的关闭，造成合法 Sass 语法被误报。
 * 只适用于某类文件的规则，放到 `overrides` 对应的作用域内。
 */
export const sharedRules: NonNullable<Config['rules']> = {
  // 空源文件由构建入口决定是否合法，不让 Stylelint 阻塞占位样式文件。
  'no-empty-source': null,
  // Vue 的深度、全局和插槽伪类由 SFC 编译器处理，CSS Modules 也允许 global。
  'selector-pseudo-class-no-unknown': [
    true,
    {
      // 允许 Vue 与 CSS Modules 的已知扩展伪类，其他未知伪类仍报告。
      ignorePseudoClasses: ['deep', 'global', 'slotted'],
    },
  ],
  // Vue 的深度、全局和插槽伪元素不是标准 CSS，但在 SFC 中是合法语法。
  'selector-pseudo-element-no-unknown': [
    true,
    {
      // 允许 Vue 的扩展伪元素，其他未知伪元素仍报告。
      ignorePseudoElements: ['v-deep', 'v-global', 'v-slotted'],
    },
  ],
}
