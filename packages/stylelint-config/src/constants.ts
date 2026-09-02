/**
 * Stylelint 共享配置的默认忽略路径。
 *
 * 这些路径属于生成物、依赖或其他不应被样式规则扫描的目录。这里保留 glob，
 * 不把消费方项目路径写死；具体绝对路径由 `createStylelintIgnoreFiles` 生成。
 */
export const stylelintDefaultIgnoreGlobs = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.wrangler/**',
  '**/coverage/**',
]

/**
 * 共享配置支持的 CSS / SCSS / UnoCSS / Tailwind at-rule。
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
]
