import type { Config } from 'stylelint'

/**
 * 只作用于 CSS 与 HTML 内联样式的规则。
 *
 * SCSS 和 Vue 文件继承官方预设，预设已按各自语法关闭了这里的规则，所以不能写在全局 `rules` 中。
 * 工具类指令（`@theme`、`@custom-variant` 等）通过 `languageOptions.syntax.atRules` 登记，
 * 核心 `at-rule-no-unknown` 无需再维护例外名单。
 */
export const cssRules: NonNullable<Config['rules']> = {
  // 工具类 @apply 使用类名参数，不按同名 CSS 指令的标准参数语法校验。
  // https://stylelint.io/user-guide/rules/at-rule-prelude-no-invalid/
  'at-rule-prelude-no-invalid': [
    true,
    {
      ignoreAtRules: ['apply'],
    },
  ],
}
