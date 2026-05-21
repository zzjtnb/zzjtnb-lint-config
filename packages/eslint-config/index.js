import antfu from '@antfu/eslint-config'

/**
 * @typedef {import('@antfu/eslint-config').OptionsConfig} AntfuConfigOptions
 * @typedef {import('@antfu/eslint-config').TypedFlatConfigItem} TypedFlatConfigItem
 * @typedef {Parameters<typeof antfu>[1]} EslintUserConfig
 * @typedef {Omit<AntfuConfigOptions & Omit<TypedFlatConfigItem, 'files' | 'ignores'>, 'formatters' | 'ignores' | 'jsonc' | 'linterOptions' | 'markdown' | 'overrides' | 'stylistic' | 'toml' | 'typescript' | 'unocss' | 'vue' | 'yaml'> & {
 *   formatters?: AntfuConfigOptions['formatters']
 *   ignores?: AntfuConfigOptions['ignores']
 *   jsonc?: AntfuConfigOptions['jsonc']
 *   linterOptions?: TypedFlatConfigItem['linterOptions']
 *   markdown?: AntfuConfigOptions['markdown']
 *   stylistic?: AntfuConfigOptions['stylistic']
 *   toml?: AntfuConfigOptions['toml']
 *   typescript?: AntfuConfigOptions['typescript']
 *   unocss?: AntfuConfigOptions['unocss']
 *   vue?: AntfuConfigOptions['vue']
 *   yaml?: AntfuConfigOptions['yaml']
 * }} EslintConfigOptions
 */

/**
 * 本包默认忽略的公共 glob。
 *
 * 这里保持为相对 glob，方便消费方在任意项目根目录直接使用。
 */
export const eslintDefaultIgnores = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/.nuxt/**',
  '**/.turbo/**',
  '**/.vercel/**',
  '**/.wrangler/**',
  '**/coverage/**',
  '**/backup/**',
  '**/src-tauri/**',
  '**/src-tauri-harmony/**',
  '**/stats.html',
  '**/twa/project/**',
  '**/fonts/**',
  '**/shadcn-vue/**',
  '**/packages/*/README*.md',
]

/**
 * 默认启用 HTML formatter。
 *
 * CSS / SCSS 交给 `stylelint-config-zzjtnb` 处理，避免 ESLint formatter 和 Stylelint
 * 对同一批样式文件重复修复；消费方仍可通过 `formatters` 开启 CSS formatter。
 *
 * @type {Exclude<AntfuConfigOptions['formatters'], boolean | undefined>}
 */
export const eslintDefaultFormatters = {
  html: true,
}

/**
 * 默认关闭 Markdown lint。
 *
 * 当前仓库使用 markdownlint-cli2 负责 Markdown，因此 ESLint 不重复检查 Markdown 内容和代码块。
 */
export const eslintDefaultMarkdown = false

/**
 * 默认代码风格。
 *
 * 与当前仓库约定保持一致：2 空格、单引号、无分号由上游规则处理。
 *
 * @type {Exclude<AntfuConfigOptions['stylistic'], boolean | undefined>}
 */
export const eslintDefaultStylistic = {
  indent: 2,
  quotes: 'single',
}

/**
 * ESLint Flat Config 支持的 linter 级选项。
 *
 * `fix` 和 `cache` 是 ESLint CLI / Node API 执行选项，不是 Flat Config 字段；
 * 共享配置里只放官方 flat config schema 支持的 `linterOptions`。
 *
 * @type {NonNullable<TypedFlatConfigItem['linterOptions']>}
 */
export const eslintLinterOptions = {
  reportUnusedDisableDirectives: 'warn',
  reportUnusedInlineConfigs: 'warn',
}

/**
 * 本包在 `@antfu/eslint-config` 之上的最小规则调整。
 *
 * 关闭 `no-console` 是为了配置包、脚本和 CLI 场景默认可直接输出运行状态。
 *
 * @type {NonNullable<TypedFlatConfigItem['rules']>}
 */
export const eslintRules = {
  'no-console': 'off',
}

/**
 * 作为独立 Flat Config 片段传给 `@antfu/eslint-config`。
 *
 * 单独导出这个对象，方便消费方在需要时复用或在集成测试里确认默认规则。
 *
 * @type {TypedFlatConfigItem}
 */
export const eslintRuleOverrides = {
  rules: eslintRules,
}

/**
 * 合并本包默认忽略列表和消费方自定义忽略配置。
 *
 * `@antfu/eslint-config` 支持数组和函数两种 `ignores` 形式，所以这里保留函数形式，
 * 避免封装后丢失上游能力。
 *
 * @param {AntfuConfigOptions['ignores']} ignores 用户传入的忽略配置。
 * @returns {AntfuConfigOptions['ignores']} 合并后的忽略配置。
 */
function resolveIgnores(ignores = []) {
  if (typeof ignores === 'function') {
    /**
     * @param {string[]} originals 上游默认忽略列表。
     * @returns {string[]} 消费方函数处理后的忽略列表。
     */
    const mergeIgnores = originals => ignores([
      ...originals,
      ...eslintDefaultIgnores,
    ])

    return mergeIgnores
  }

  return [
    ...eslintDefaultIgnores,
    ...ignores,
  ]
}

/**
 * 合并本包默认 formatter 和消费方 formatter 配置。
 *
 * 传入对象时表示在默认 HTML formatter 上扩展；传入布尔值时遵循上游语义，
 * `true` 启用全部 formatter，`false` 关闭 formatter。
 *
 * @param {AntfuConfigOptions['formatters']} formatters 用户传入的 formatter 配置。
 * @returns {AntfuConfigOptions['formatters']} 合并后的 formatter 配置。
 */
function resolveFormatters(formatters = eslintDefaultFormatters) {
  if (typeof formatters === 'boolean')
    return formatters

  return {
    ...eslintDefaultFormatters,
    ...formatters,
  }
}

/**
 * 合并本包默认代码风格和消费方代码风格配置。
 *
 * 始终返回新对象，避免上游在规范化选项时修改本包导出的默认对象。
 *
 * @param {AntfuConfigOptions['stylistic']} stylistic 用户传入的代码风格配置。
 * @returns {AntfuConfigOptions['stylistic']} 合并后的代码风格配置。
 */
function resolveStylistic(stylistic = eslintDefaultStylistic) {
  if (typeof stylistic === 'boolean')
    return stylistic

  return {
    ...eslintDefaultStylistic,
    ...stylistic,
  }
}

/**
 * 合并本包默认 linter 选项和消费方 linter 选项。
 *
 * @param {TypedFlatConfigItem['linterOptions']} linterOptions 用户传入的 linter 选项。
 * @returns {TypedFlatConfigItem['linterOptions']} 合并后的 linter 选项。
 */
function resolveLinterOptions(linterOptions = {}) {
  return {
    ...eslintLinterOptions,
    ...linterOptions,
  }
}

/**
 * 创建本包默认 ESLint Flat Config。
 *
 * 默认启用 TypeScript、Vue、UnoCSS、JSON / JSONC、YAML、TOML、HTML formatter、
 * 共享忽略列表和 unused disable 检查，并默认关闭 Markdown lint（交给 markdownlint）；
 * 消费方可以通过第一个参数覆盖默认选项，也可以在后续参数继续追加 Flat Config 片段。
 *
 * @param {EslintConfigOptions} [options] 本包和 `@antfu/eslint-config` 兼容的选项。
 * @param {...EslintUserConfig} configs 追加的 ESLint Flat Config 片段。
 * @returns {ReturnType<typeof antfu>} ESLint Flat Config Composer。
 */
export function defineEslintConfig(options = {}, ...configs) {
  const {
    formatters = eslintDefaultFormatters,
    ignores = [],
    jsonc = true,
    linterOptions = {},
    markdown = eslintDefaultMarkdown,
    stylistic = eslintDefaultStylistic,
    toml = true,
    typescript = true,
    unocss = true,
    vue = true,
    yaml = true,
    ...antfuOptions
  } = options

  return antfu(
    {
      typescript,
      vue,
      unocss,
      jsonc,
      yaml,
      toml,
      formatters: resolveFormatters(formatters),
      ignores: resolveIgnores(ignores),
      linterOptions: resolveLinterOptions(linterOptions),
      markdown,
      stylistic: resolveStylistic(stylistic),
      ...antfuOptions,
    },
    eslintRuleOverrides,
    ...configs,
  )
}

/**
 * 创建基础 JavaScript / TypeScript 配置。
 *
 * 默认关闭 Vue 和 UnoCSS，适合纯工具包或 Node 脚本包。
 *
 * @param {EslintConfigOptions} [options] 本包和 `@antfu/eslint-config` 兼容的选项。
 * @param {...EslintUserConfig} configs 追加的 ESLint Flat Config 片段。
 * @returns {ReturnType<typeof antfu>} ESLint Flat Config Composer。
 */
export function base(options = {}, ...configs) {
  return defineEslintConfig(
    {
      vue: false,
      unocss: false,
      ...options,
    },
    ...configs,
  )
}

/**
 * 创建 Vue 项目配置。
 *
 * 显式启用 Vue，其余默认集成保持不变；如需纯 Vue，可传入 `unocss: false`。
 *
 * @param {EslintConfigOptions} [options] 本包和 `@antfu/eslint-config` 兼容的选项。
 * @param {...EslintUserConfig} configs 追加的 ESLint Flat Config 片段。
 * @returns {ReturnType<typeof antfu>} ESLint Flat Config Composer。
 */
export function vue(options = {}, ...configs) {
  return defineEslintConfig(
    {
      vue: true,
      ...options,
    },
    ...configs,
  )
}

/**
 * 创建 UnoCSS 项目配置。
 *
 * 显式启用 UnoCSS，其余默认集成保持不变；如需非 Vue 项目，可传入 `vue: false`。
 *
 * @param {EslintConfigOptions} [options] 本包和 `@antfu/eslint-config` 兼容的选项。
 * @param {...EslintUserConfig} configs 追加的 ESLint Flat Config 片段。
 * @returns {ReturnType<typeof antfu>} ESLint Flat Config Composer。
 */
export function uno(options = {}, ...configs) {
  return defineEslintConfig(
    {
      unocss: true,
      ...options,
    },
    ...configs,
  )
}

export default defineEslintConfig
