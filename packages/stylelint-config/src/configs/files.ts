import type { Config } from 'stylelint'

import postcssHtml from 'postcss-html'
import postcssScss from 'postcss-scss'

import { cssRules } from '../rules/css.js'
import { scssRules } from '../rules/scss.js'
import { scssPresets, vuePresets } from './presets.js'

/**
 * 按文件类型选择 parser 和 SCSS preset。
 *
 * - HTML 使用 `postcss-html`，让 Stylelint 能定位内联样式；
 * - Vue 使用 `postcss-html`，并加载官方 Vue + SCSS 容器 preset；
 * - SCSS 使用 `postcss-scss` 和 recommended SCSS preset；
 * - 普通 CSS 不加载 SCSS parser，避免把 SCSS 语义扩散到所有文件。
 *
 * 只适用于 CSS / HTML 的规则放在对应 override 的 `rules` 中；SCSS 与 Vue 继承的官方预设
 * 已经按各自语法关闭了这些规则，不能写进全局 `rules`，否则会抵消预设。
 */
export const fileOverrides: NonNullable<Config['overrides']> = [
  {
    files: ['*.css', '**/*.css'],
    rules: cssRules,
  },
  {
    files: [
      '*.html',
      '**/*.html',
      '*.htm',
      '**/*.htm',
    ],
    customSyntax: postcssHtml,
    rules: cssRules,
  },
  {
    files: ['*.vue', '**/*.vue'],
    customSyntax: postcssHtml,
    extends: vuePresets,
    rules: scssRules,
  },
  {
    files: ['*.scss', '**/*.scss'],
    customSyntax: postcssScss,
    extends: scssPresets,
    rules: scssRules,
  },
]
