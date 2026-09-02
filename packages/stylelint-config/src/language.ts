import { utilityAtRules } from './constants.js'

/**
 * Stylelint 17 语言模型中的 at-rule 描述。
 *
 * 这些 at-rule 先通过官方 `languageOptions.syntax` 注册；SCSS 专用规则暂时不会
 * 读取这个语言模型，因此 `stylelintScssAtRuleOptions` 会在规则层重复引用名称列表。
 */
const utilityAtRuleSyntax = Object.fromEntries(
  utilityAtRules.map(atRule => [
    atRule,
    { comment: 'Utility-first framework directive' },
  ]),
)

/**
 * Stylelint 17 的语言扩展。
 *
 * `rpx` 是 uni-app / 小程序生态的长度单位；它只放在 `length` 分类，不绕过其他
 * 单位规则，也不把自定义单位扩展成全局字符串白名单。
 */
export const stylelintLanguageOptions = {
  syntax: {
    atRules: utilityAtRuleSyntax,
    units: {
      length: ['rpx'],
    },
  },
}

/**
 * SCSS 插件使用的 at-rule 例外。
 *
 * SCSS preset 会启用 `scss/at-rule-no-unknown`，而该规则
 * 不读取 `languageOptions.syntax.atRules`，所以必须显式复用同一份语法列表。
 */
export const stylelintScssAtRuleOptions = {
  ignoreAtRules: utilityAtRules,
}
