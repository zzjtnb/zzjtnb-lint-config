import type { Linter } from 'eslint'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types.js'

import antfu from '@antfu/eslint-config'

import { ignores } from './configs/ignores.js'
import { javascript } from './configs/javascript.js'
import { pnpm } from './configs/pnpm.js'
import { vueRuleConfig } from './configs/vue.js'

export type * from './types.js'

/**
 * 创建基于 antfu 的 ESLint Flat Config。
 *
 * antfu 负责插件注册和各语言的推荐规则，本包仅追加明确公开的规则约定。
 */
export async function zzjtnb(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  const {
    defaultIgnores,
    ignores: ignoreOverrides,
    linterOptions,
    pnpm: pnpmOptions = true,
    rules,
    vue: vueOptions = true,
    ...antfuOptions
  } = options

  return antfu(
    {
      // 维持 antfu 的 options → configs 使用方式；本包只在这一层补充默认 TypeScript、
      // Vue 以及明确公开的忽略项策略，其他上游选项原样传递。
      typescript: true,
      vue: vueOptions,
      ...antfuOptions,
      ignores: ignores(ignoreOverrides, defaultIgnores),
      pnpm: pnpmOptions,
    },
    javascript(rules, linterOptions),
    ...pnpm(pnpmOptions),
    // Vue 开启（包括对象形式）时追加本包公开的 Vue 规则。
    ...(vueOptions === false ? [] : [vueRuleConfig]),
    ...configs,
  ).toConfigs()
}
