import process from 'node:process'
import postcssHtml from 'postcss-html'
import postcssScss from 'postcss-scss'

/**
 * @typedef {import('stylelint').Config} StylelintConfig
 */

/**
 * Stylelint 官方的共享配置模型是：发布一个普通 JS 配置对象，
 * 使用者通过 `extends: ['stylelint-config-xxx']` 继承它。
 *
 * 这里保留命名导出，不是为了让使用者展开 `extends`，而是为了让需要本地扩展
 * `rules` / `ignoreFiles` / `overrides` 的项目能显式复用共享片段，避免复制整份配置。
 */

/**
 * 将 Windows 路径统一成正斜杠，保证传给 fast-glob / micromatch 的忽略规则跨平台一致。
 *
 * 对三方共享配置包尤其重要：相对 `ignoreFiles` 在不同加载方式下可能以包目录或
 * `configBasedir` 为基准解析；使用用户执行 Stylelint 时的 `process.cwd()` 可以让这些
 * 忽略规则始终指向消费方项目，而不是指向 `node_modules/stylelint-config-zzjtnb`。
 */
const cwd = process.cwd().replace(/\\/g, '/')

/**
 * Utility-first 框架常见 at-rules。
 *
 * 这些指令会先注册到 Stylelint 17 的 `languageOptions.syntax.atRules`。
 * SCSS 专用规则目前仍需要自己的 `ignoreAtRules`，下方会复用同一份列表，避免两边漂移。
 */
const utilityAtRules = [
  // UnoCSS / Tailwind 风格指令。
  'custom-variant',
  'apply',
  'screen',
  'theme',
  'unocss',
  'layer',
  'variants',
  'responsive',
  'utilities',

  // UnoCSS 生态扩展指令。
  'uno',
  'unocss-variants',
  'unocss-apply',
  'container-queries',

  // Tailwind 标准入口。
  'tailwind',

  // CSS Container Queries / utility variant workflows 中常见的自定义入口。
  'container',
]

/**
 * 把 utility-first 框架指令注册到 Stylelint 17 的语言语法知识中。
 */
const utilityAtRuleSyntax = Object.fromEntries(
  utilityAtRules.map(atRule => [
    atRule,
    { comment: 'Utility-first framework directive' },
  ]),
)

/**
 * `function-no-unknown` 目前不读取 `languageOptions`。
 *
 * 因此 Tailwind / UnoCSS 风格的 `theme()` 和 Vue SFC 的 `v-bind()` 仍需要在规则层声明，
 * 这是目标技术栈的直接支持。
 */
const customFunctions = [
  'theme',
  'v-bind',
]

/**
 * Stylelint 17 提供 `languageOptions.syntax` 来扩展规则使用的 CSS 语法知识。
 *
 * utility-first 框架指令属于项目语法扩展，应注册到 atRules；`rpx` 本质上是
 * uni-app / 小程序生态中的长度单位，因此应注册到 length 单位分类。
 *
 * 这些优先由最新 `languageOptions` 表达；仅当第三方语法专用规则尚未读取
 * `languageOptions` 时，才在对应规则里复用同一份语法列表。
 *
 * @satisfies {NonNullable<StylelintConfig['languageOptions']>}
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
 * SCSS 规则层需要复用的 utility-first at-rule 配置。
 *
 * `stylelint-config-recommended-scss` 会启用 `scss/at-rule-no-unknown`。
 * 该规则来自 SCSS 插件，不会读取 Stylelint 核心的 `languageOptions.syntax.atRules`，
 * 因此需要在规则层补齐同一份项目语法知识。
 *
 * @satisfies {{ ignoreAtRules: string[] }}
 */
export const stylelintScssAtRuleOptions = {
  ignoreAtRules: utilityAtRules,
}

/**
 * Stylelint 的 disable 注释很容易在代码演进后变成“永久豁免”。
 *
 * 作为共享配置，这里只用 warning 级别提醒：
 * - disable 必须说明原因，方便评审时判断是否合理。
 * - disable 作用域必须有效，避免拼错规则名后静默失效。
 * - 已经不需要的 disable 应被清理，避免掩盖未来真实问题。
 * - 不推荐裸写 `stylelint-disable`，应尽量限定到具体规则。
 *
 * 这些检查提升维护性，但不应该默认以 error 阻塞所有消费方项目。
 */
/** @type {NonNullable<StylelintConfig['reportNeedlessDisables']>} */
const disableReportSettings = [true, { severity: 'warning' }]

/**
 * @satisfies {Pick<StylelintConfig,
 *   | 'reportDescriptionlessDisables'
 *   | 'reportInvalidScopeDisables'
 *   | 'reportNeedlessDisables'
 *   | 'reportUnscopedDisables'
 * >}
 */
export const stylelintReportOptions = {
  reportDescriptionlessDisables: disableReportSettings,
  reportInvalidScopeDisables: disableReportSettings,
  reportNeedlessDisables: disableReportSettings,
  reportUnscopedDisables: disableReportSettings,
}

/**
 * Stylelint 官方配置对象支持这些执行选项，但本包只默认开启不会写文件的容错行为。
 *
 * - `allowEmptyInput: true`：monorepo 中某些包没有样式文件时不报错。
 * - `cache: false`：缓存策略由消费方脚本或本地配置显式开启。
 * - `fix: false`：写回文件属于执行策略，由消费方脚本或本地配置显式开启。
 *
 * 这样消费方可以按调用方式选择清晰位置声明 `fix` / `cache`，
 * 避免共享配置隐式开启缓存或写回文件。
 *
 * @satisfies {Pick<StylelintConfig, 'allowEmptyInput' | 'cache' | 'fix'>}
 */
export const stylelintExecutionOptions = {
  allowEmptyInput: true,
  cache: false,
  fix: false,
}

/**
 * 共享 preset 的顺序会影响最终结果：Stylelint 先加载前面的配置，后面的配置再追加
 * 或覆盖前面的配置。
 *
 * 顺序设计：
 * 1. `recommended-scss` 提供 CSS / SCSS 基础错误检测规则。
 * 2. `recommended-vue/scss` 处理 Vue SFC + SCSS 组合场景。
 * 3. `clean-order` 最后接管属性顺序，避免前面 preset 覆盖排序策略。
 */
export const stylelintExtends = [
  'stylelint-config-recommended-scss',
  'stylelint-config-recommended-vue/scss',
  'stylelint-config-clean-order',
]

/**
 * 规则层只放“跨项目稳定成立”的行为取舍。
 *
 * 设计原则：
 * - 项目语法扩展优先放进 `languageOptions`；需要规则层兼容时复用同一份语法列表。
 * - 不关闭 recommended preset 已经能正确处理的规则。
 * - 只在现代框架、SFC 容器语法、utility-first 写法明显会误报时放宽。
 * - 本地项目仍可在自己的 `rules` 中覆盖这些默认值。
 *
 * @satisfies {NonNullable<StylelintConfig['rules']>}
 */
export const stylelintRules = {
  'function-no-unknown': [true, {
    ignoreFunctions: customFunctions,
  }],

  // SCSS 专用 unknown at-rule 规则不读取 languageOptions，需要显式复用同一份 at-rule 列表。
  'scss/at-rule-no-unknown': [true, stylelintScssAtRuleOptions],

  // 运算符换行和空格属于团队格式偏好，不作为推荐级错误阻塞。
  'scss/operator-no-newline-after': null,
  'scss/operator-no-unspaced': null,
}

/**
 * Stylelint 文档说明：设置 `ignoreFiles` 会覆盖默认的 `node_modules` 忽略规则。
 * 因此这里必须显式保留 `node_modules`，否则消费方项目可能开始检查依赖目录。
 *
 * 所有路径都基于消费方项目的 CWD 生成绝对 glob，原因见上方 `cwd` 注释。
 * 本地项目如需追加忽略项，推荐：`ignoreFiles: [...stylelintIgnoreFiles, 'generated/**']`。
 *
 * @satisfies {NonNullable<StylelintConfig['ignoreFiles']>}
 */
export const stylelintIgnoreFiles = [
  // 与 ESLint / Markdownlint 保持同一份公共忽略语义。
  `${cwd}/**/node_modules/**`,
  `${cwd}/**/dist/**`,
  `${cwd}/**/build/**`,
  `${cwd}/**/.nuxt/**`,
  `${cwd}/**/.turbo/**`,
  `${cwd}/**/.vercel/**`,
  `${cwd}/**/.wrangler/**`,
  `${cwd}/**/coverage/**`,
  `${cwd}/**/backup/**`,
  `${cwd}/**/src-tauri/**`,
  `${cwd}/**/src-tauri-harmony/**`,
  `${cwd}/**/stats.html`,
  `${cwd}/**/twa/project/**`,
  `${cwd}/**/fonts/**`,
  `${cwd}/**/shadcn-vue/**`,
  `${cwd}/**/packages/*/README*.md`,
]

/**
 * 多语法入口必须放在 `overrides` 中，而不是设置全局 `customSyntax`：
 * - `.vue` 需要容器语法 `postcss-html` 来识别 SFC `<style>` 块。
 * - `.scss` 需要 `postcss-scss` 来解析 SCSS 专用语法。
 *
 * `postcss-html` 文档推荐通过 `overrides.customSyntax` 处理 HTML / Vue 类文件，
 * `postcss-scss` 文档提供 SCSS parser；本包直接导入 parser 对象并写入 `customSyntax`。
 *
 * @satisfies {NonNullable<StylelintConfig['overrides']>}
 */
export const stylelintOverrides = [
  {
    files: ['*.html', '**/*.html', '*.htm', '**/*.htm'],
    customSyntax: postcssHtml,
  },
  {
    files: ['*.vue', '**/*.vue'],
    customSyntax: postcssHtml,
  },
  {
    files: ['*.scss', '**/*.scss'],
    customSyntax: postcssScss,
  },
]

/**
 * 默认导出就是发布给 Stylelint `extends` 解析的共享配置对象。
 *
 * 注意：不要在这里改成工厂函数或 `defineStylelintConfig()` 之类的额外抽象。
 * Stylelint 官方示例和生态里的 `stylelint-config-*` 包都以普通配置对象作为主入口，
 * 这样用户才能继续使用最直观的：
 *
 * ```js
 * export default {
 *   extends: ['stylelint-config-zzjtnb'],
 * }
 * ```
 *
 * @satisfies {StylelintConfig}
 */
const stylelintConfig = {
  extends: stylelintExtends,
  ...stylelintExecutionOptions,
  languageOptions: stylelintLanguageOptions,
  ...stylelintReportOptions,
  rules: stylelintRules,
  ignoreFiles: stylelintIgnoreFiles,
  overrides: stylelintOverrides,
}

export default stylelintConfig
