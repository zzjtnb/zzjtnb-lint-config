import type antfu from '@antfu/eslint-config'
import type { OptionsConfig } from '@antfu/eslint-config'

type AntfuConfigInput = Parameters<typeof antfu>[1]

/** 传给 `zzjtnb` 的后续 Flat Config 片段。 */
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

/**
 * `pnpm` 集成的完整选项。
 *
 * 完全沿用 antfu 的 `pnpm` 对象选项，不新增额外字段。
 */
export type ESLintPnpmOptions = Exclude<
  NonNullable<OptionsConfig['pnpm']>,
  boolean
>

/**
 * `zzjtnb()` 的首个配置对象。
 *
 * 完整继承 antfu 的 options 与单个 Flat Config 字段，避免把上游已有选项重新包装为
 * 本包私有 API。`files` 仅属于后续配置片段，不能出现在全局选项对象中。
 */
export type ESLintConfigOptions = Omit<NonNullable<Parameters<typeof antfu>[0]>, 'ignores'> & {
  /** 在 antfu 默认忽略项之后追加本包的通用生成物路径；传 `false` 时由消费方完全接管。 */
  defaultIgnores?: readonly string[] | false
  /** 与 antfu 保持一致的忽略项输入。 */
  ignores?: OptionsConfig['ignores']
}
