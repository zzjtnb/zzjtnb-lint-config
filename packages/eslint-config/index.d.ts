import type antfu from '@antfu/eslint-config'
import type {
  OptionsConfig as AntfuConfigOptions,
  TypedFlatConfigItem,
} from '@antfu/eslint-config'

type AntfuConfigInput = Parameters<typeof antfu>[1]

type AntfuBaseOptions = Omit<
  AntfuConfigOptions & Omit<TypedFlatConfigItem, 'files' | 'ignores'>,
  'formatters' | 'ignores' | 'jsonc' | 'linterOptions' | 'markdown' | 'overrides' | 'stylistic' | 'toml' | 'typescript' | 'unocss' | 'vue' | 'yaml'
>

/** 本包默认导出的 ESLint Flat Config Composer。 */
export type EslintConfig = ReturnType<typeof antfu>

/** 传给 `defineEslintConfig` 后续参数的 Flat Config 片段类型。 */
export type EslintUserConfig = NonNullable<AntfuConfigInput>

/** 本包第一个参数支持的配置选项。 */
export interface EslintConfigOptions extends AntfuBaseOptions {
  /** 默认启用 HTML formatter；传对象时会与默认值合并，传 `false` 可关闭。 */
  formatters?: AntfuConfigOptions['formatters']
  /** 扩展默认忽略列表；也支持 `@antfu/eslint-config` 的函数形式。 */
  ignores?: AntfuConfigOptions['ignores']
  /** 默认启用 JSON / JSONC 支持。 */
  jsonc?: AntfuConfigOptions['jsonc']
  /** ESLint Flat Config 支持的 linter 级选项。 */
  linterOptions?: TypedFlatConfigItem['linterOptions']
  /** 默认关闭 Markdown lint，交给 markdownlint-cli2 处理。 */
  markdown?: AntfuConfigOptions['markdown']
  /** 默认使用 2 空格和单引号。 */
  stylistic?: AntfuConfigOptions['stylistic']
  /** 默认启用 TOML 支持。 */
  toml?: AntfuConfigOptions['toml']
  /** 默认启用 TypeScript 支持。 */
  typescript?: AntfuConfigOptions['typescript']
  /** 默认启用 UnoCSS 支持。 */
  unocss?: AntfuConfigOptions['unocss']
  /** 默认启用 Vue 支持。 */
  vue?: AntfuConfigOptions['vue']
  /** 默认启用 YAML 支持。 */
  yaml?: AntfuConfigOptions['yaml']
}

/** 本包默认启用的 formatter 对象类型。 */
export type EslintFormatterOptions = Exclude<AntfuConfigOptions['formatters'], boolean | undefined>

/** 本包默认启用的 stylistic 对象类型。 */
export type EslintStylisticOptions = Exclude<AntfuConfigOptions['stylistic'], boolean | undefined>

/** 本包默认忽略的公共 glob。 */
export declare const eslintDefaultIgnores: string[]

/** 本包默认启用的 HTML formatter。 */
export declare const eslintDefaultFormatters: EslintFormatterOptions

/** 本包默认关闭 Markdown lint，交给 markdownlint-cli2。 */
export declare const eslintDefaultMarkdown: false

/** 本包默认启用的代码风格选项。 */
export declare const eslintDefaultStylistic: EslintStylisticOptions

/** 本包默认启用的 ESLint linter 级选项。 */
export declare const eslintLinterOptions: NonNullable<TypedFlatConfigItem['linterOptions']>

/** 本包在 `@antfu/eslint-config` 之上的最小规则调整。 */
export declare const eslintRules: NonNullable<TypedFlatConfigItem['rules']>

/** 传给 `@antfu/eslint-config` 的规则覆盖 Flat Config 片段。 */
export declare const eslintRuleOverrides: TypedFlatConfigItem

/** 创建本包默认 ESLint Flat Config。 */
export declare function defineEslintConfig(
  options?: EslintConfigOptions,
  ...configs: EslintUserConfig[]
): EslintConfig

/** 创建基础 JavaScript / TypeScript 配置，默认关闭 Vue 和 UnoCSS。 */
export declare function base(
  options?: EslintConfigOptions,
  ...configs: EslintUserConfig[]
): EslintConfig

/** 创建 Vue 项目配置，其余默认集成保持不变。 */
export declare function vue(
  options?: EslintConfigOptions,
  ...configs: EslintUserConfig[]
): EslintConfig

/** 创建 UnoCSS 项目配置，其余默认集成保持不变。 */
export declare function uno(
  options?: EslintConfigOptions,
  ...configs: EslintUserConfig[]
): EslintConfig

declare const eslintConfig: typeof defineEslintConfig

export default eslintConfig
