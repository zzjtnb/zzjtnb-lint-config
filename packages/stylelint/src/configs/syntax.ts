/**
 * 工具类框架（Tailwind CSS、UnoCSS）的自定义 at-rule。
 *
 * 只收录 Stylelint 与 SCSS 插件原生不认识的指令：
 * - Sass 内置指令（`@mixin`、`@include`、`@each`、`@use` 等）由 SCSS 预设和插件原生识别，不应放进来；
 *   把它们注册进语言模型会让核心规则按 CSS 语法检查其参数，反而造成误报。
 * - `@apply`、`@layer`、`@container`、`@media` 等已被 Stylelint 原生识别，同样不重复登记。
 *
 * 核心规则读取 `languageOptions.syntax.atRules`，SCSS 插件规则不读取，因此这份列表会同时
 * 提供给两处，避免漂移。Tailwind v4 官方指令见 https://tailwindcss.com/docs/functions-and-directives 。
 */
export const utilityAtRules = [
  'config',
  'container-queries',
  'custom-variant',
  'extends',
  'ignores',
  'plugin',
  'reference',
  'responsive',
  'screen',
  'source',
  'tailwind',
  'theme',
  'uno',
  'unocss',
  'unocss-apply',
  'unocss-variants',
  'utilities',
  'utility',
  'variant',
  'variants',
] as const

/**
 * Stylelint 17 语言模型中的 at-rule 描述。
 *
 * 这些 at-rule 先通过官方 `languageOptions.syntax` 注册；SCSS 专用规则暂时不会
 * 读取这个语言模型，因此 SCSS 规则会直接复用下面的指令名称列表。
 */
const atRules = Object.fromEntries(
  utilityAtRules.map(atRule => [
    atRule,
    {
      // 描述额外语法的用途，不作为实际样式输入。
      comment: 'Utility-first framework directive',
    },
  ]),
)

/**
 * Stylelint 17 的语言扩展。
 *
 * `rpx` 是 uni-app / 小程序生态的长度单位；它只放在 `length` 分类，不绕过其他
 * 单位规则，也不把自定义单位扩展成全局字符串白名单。
 */
export const languageOptions = {
  // 为 Stylelint 提供项目合法语法扩展。
  syntax: {
    atRules,
    // 按单位维度声明项目额外支持的合法单位。
    units: {
      // 将 rpx 识别为长度单位，不绕过其他单位检查。
      length: ['rpx'],
    },
  },
}
