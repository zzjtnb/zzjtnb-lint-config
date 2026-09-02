import type { Config } from 'stylelint'

import postcssHtml from 'postcss-html'
import postcssScss from 'postcss-scss'

import { stylelintScssExtends, stylelintVueExtends } from './extends.js'
import { stylelintScssRules } from './rules.js'

/**
 * 按文件类型选择 parser 和 SCSS preset。
 *
 * - HTML 使用 `postcss-html`，让 Stylelint 能定位内联样式；
 * - Vue 使用 `postcss-html`，并加载官方 Vue + SCSS 容器 preset；
 * - SCSS 使用 `postcss-scss` 和 recommended SCSS / Vue SCSS preset；
 * - 普通 CSS 不加载 SCSS parser，避免把 SCSS 语义扩散到所有文件。
 */
export const stylelintOverrides: NonNullable<Config['overrides']> = [
  {
    files: ['*.html', '**/*.html', '*.htm', '**/*.htm'],
    customSyntax: postcssHtml,
  },
  {
    files: ['*.vue', '**/*.vue'],
    customSyntax: postcssHtml,
    extends: stylelintVueExtends,
    rules: stylelintScssRules,
  },
  {
    files: ['*.scss', '**/*.scss'],
    customSyntax: postcssScss,
    extends: [...stylelintScssExtends, ...stylelintVueExtends],
    rules: stylelintScssRules,
  },
]
