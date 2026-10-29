/** 按文件语法创建独立覆盖：CSS、HTML、Vue 与 SCSS 的规则和 parser 各有作用范围。 */
import type { Config } from 'stylelint'

import postcssHtml from 'postcss-html'
import postcssScss from 'postcss-scss'

import { cssRules } from '../rules/css'
import { scssRules } from '../rules/scss'
import { scssPresets, vuePresets } from './presets'

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
export function fileOverrides(): NonNullable<Config['overrides']> {
  return [
    {
    // 限定当前配置块匹配的文件路径，其他文件不使用此块。
      files: ['*.css', '**/*.css'],
      // 仅维护本作用域的规则差异；消费方同名值按调用顺序覆盖。
      rules: structuredClone(cssRules),
    },
    {
    // 限定当前配置块匹配的文件路径，其他文件不使用此块。
      files: [
        '*.html',
        '**/*.html',
        '*.htm',
        '**/*.htm',
      ],
      // 为当前文件类型选择语法解析器，避免将容器内容按普通 CSS 解析。
      customSyntax: postcssHtml,
      // 仅维护本作用域的规则差异；消费方同名值按调用顺序覆盖。
      rules: structuredClone(cssRules),
    },
    {
    // 限定当前配置块匹配的文件路径，其他文件不使用此块。
      files: ['*.vue', '**/*.vue'],
      // 追加本作用域所需的预设，预设自身继续维护其默认规则。
      extends: [...vuePresets],
      // 由本包加载解析器，避免链接消费时从消费方依赖树解析上游的裸包名。
      customSyntax: postcssHtml,
      // 仅维护本作用域的规则差异；消费方同名值按调用顺序覆盖。
      rules: structuredClone(scssRules),
    },
    {
    // 限定当前配置块匹配的文件路径，其他文件不使用此块。
      files: ['*.scss', '**/*.scss'],
      // 追加本作用域所需的预设，预设自身继续维护其默认规则。
      extends: [...scssPresets],
      // 与 Vue/HTML 一样传入解析器实例，消费方无需重复安装内部语法依赖。
      customSyntax: postcssScss,
      // 仅维护本作用域的规则差异；消费方同名值按调用顺序覆盖。
      rules: structuredClone(scssRules),
    },
  ]
}
