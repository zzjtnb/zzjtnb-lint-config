/** 复用 antfu 的公开参数类型，只增加本包确有需要的忽略策略选项。 */
import type antfu from '@antfu/eslint-config'
import type { OptionsConfig } from '@antfu/eslint-config'

/** 传给 `zzjtnb` 的后续 antfu 配置输入，保留对象、数组、异步结果和 composer 能力。 */
export type ESLintUserConfig = NonNullable<Parameters<typeof antfu>[1]>

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
 * 继承 antfu 当前的 options 与单个 Flat Config 字段，排除已弃用的顶层 overrides，不包装为
 * 本包私有 API。`files` 仅属于后续配置片段，不能出现在全局选项对象中。
 */
export type ESLintConfigOptions = Omit<NonNullable<Parameters<typeof antfu>[0]>, 'overrides'> & {
  /** 替换本包追加的通用忽略列表；false 同时接管该入口中的上游列表，不关闭独立的 gitignore 集成。 */
  defaultIgnores?: readonly string[] | false
}
