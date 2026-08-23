import type antfu from '@antfu/eslint-config'
import type {
  OptionsConfig,
  TypedFlatConfigItem,
} from '@antfu/eslint-config'

type AntfuConfigInput = Parameters<typeof antfu>[1]

/** 传给 `defineConfig` 的后续 Flat Config 片段。 */
export type ESLintUserConfig = NonNullable<AntfuConfigInput>

/**
 * antfu 的 stylistic 对象选项。
 *
 * 这是上游 `OptionsConfig['stylistic']` 去掉 boolean 分支后的类型；本包不
 * 重新定义这些字段，因此上游新增或收紧字段时，消费方也会得到同步提示。
 */
export type ESLintStylisticOptions = Exclude<
  NonNullable<OptionsConfig['stylistic']>,
  boolean
>

/** 本包在 `@antfu/eslint-config` 之上增加的选项。 */
export type ESLintConfigOptions = Omit<
  OptionsConfig & Omit<TypedFlatConfigItem, 'files' | 'ignores'>,
  'ignores'
> & {
  /** 是否保留本包的默认忽略项；传 `false` 可完全接管忽略列表。 */
  defaultIgnores?: string[] | false
  /** 是否启用 pnpm-workspace.yaml 的 parser 和排序规则。 */
  pnpmWorkspace?: boolean
  /** 追加或覆盖本包共享的 ESLint 规则。 */
  rules?: TypedFlatConfigItem['rules']
  /** 在选定的默认忽略项之后追加消费方路径。 */
  ignores?: OptionsConfig['ignores']
}
