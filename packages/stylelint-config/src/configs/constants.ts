/**
 * 共享 CSS / SCSS / UnoCSS / Tailwind at-rule。
 *
 * 核心 Stylelint 规则和 SCSS 插件规则读取配置的方式不同，因此这份列表会同时
 * 提供给 `languageOptions.syntax.atRules` 和 `scss/at-rule-no-unknown`，避免两处漂移。
 */
export const utilityAtRules = [
  'apply',
  'at-root',
  'container',
  'container-queries',
  'custom-variant',
  'each',
  'else',
  'extends',
  'for',
  'forward',
  'function',
  'if',
  'ignores',
  'include',
  'layer',
  'media',
  'mixin',
  'plugin',
  'reference',
  'responsive',
  'return',
  'screen',
  'source',
  'tailwind',
  'theme',
  'unocss',
  'unocss-apply',
  'unocss-variants',
  'uno',
  'use',
  'utility',
  'utilities',
  'variants',
] as const
