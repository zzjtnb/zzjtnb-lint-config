/** 公开 ESLint 工厂：组装 antfu 选项、本包差异与消费方后置覆盖。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types'

import antfu from '@antfu/eslint-config'

import { antislopRules, scopeAntislop } from './configs/antislop'
import { ignores } from './configs/ignores'

import { overrideJavaScript } from './configs/javascript'
import { withOverrides } from './configs/overrides'
import { pnpm } from './configs/pnpm'
import { stylistic } from './configs/stylistic'
import { test } from './configs/test'
import { toml } from './configs/toml'
import { plugins } from './plugins'

/**
 * 创建基于 antfu 的 ESLint Flat Config。
 *
 * 通过上游各集成的覆盖入口提供默认差异，保留语言作用域、声明文件豁免和后置配置顺序。
 * 不将语言覆盖重新追加到所有集成之后，避免反向盖掉 TypeScript 等专属规则。
 *
 * @param options 语言集成与共享规则选项，其中 rules 覆盖全部共享默认规则。
 * @param configs 追加的 Flat Config 片段，优先于首个选项对象中的规则。
 * @returns 可直接作为 ESLint 默认导出的异步 Flat Config 数组。
 */
export async function zzjtnb(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<TypedFlatConfigItem[]> {
  const {
    defaultIgnores,
    ignores: ignoreOverrides,
    linterOptions,
    pnpm: pnpmOptions,
    rules,
    typescript: typescriptOptions = true,
    ...antfuOptions
  } = options
  // 规则选项包含数组与对象，每次调用各自复制，避免消费方修改返回配置后污染下一次调用。
  const sharedRules = structuredClone({
    stylistic,
    toml,
    test,
  })

  // 默认开启 Vue 无障碍；关闭 Vue 时不注册插件，显式 a11y: false 仍由消费方决定。
  let vue: ESLintConfigOptions['vue'] = { a11y: true }
  if (antfuOptions.vue === false) {
    vue = false
  }
  else if (typeof antfuOptions.vue === 'object') {
    vue = {
      ...vue,
      ...antfuOptions.vue,
    }
  }

  // 固定追加顺序：本包插件默认值 → 消费方全局 rules → 消费方后续配置片段。
  const additions: ESLintUserConfig[] = [
    {
      name: 'zzjtnb/plugins',
      plugins: { ...plugins },
      rules: { 'zzjtnb/import-extensions': 'error' },
    },
  ]
  if (rules)
    additions.push({ name: 'zzjtnb/rules', rules })
  additions.push(...configs)

  const composer = antfu(
    {
      // 保留本包默认开启 TypeScript，解析器选项直接交给上游。
      typescript: typescriptOptions,
      // 默认启用上游 antislop；消费方可关闭或配置其子集。
      ...antfuOptions,
      antislop: withOverrides(antfuOptions.antislop, antislopRules),
      // 调用共享忽略策略，结合消费方开关与追加项生成最终列表。
      ignores: ignores(ignoreOverrides, defaultIgnores),
      // 将消费方 pnpm 集成选项传给上游，不重复定义上游默认值。
      pnpm: pnpmOptions,
      // 合并共享的 ESLint 报告策略与消费方覆盖，不混入 CLI 参数。
      linterOptions: { reportUnusedInlineConfigs: 'warn', ...linterOptions },
      test: withOverrides(antfuOptions.test, sharedRules.test),
      stylistic: withOverrides(antfuOptions.stylistic, sharedRules.stylistic),
      toml: withOverrides(antfuOptions.toml, sharedRules.toml),
      vue,
    },
    ...additions,
  )
  // 保留上游片段顺序，分别调整默认级别、antislop 范围与两项 pnpm 差异。
  return composer
    .override('antfu/javascript/rules', config => overrideJavaScript(config, antfuOptions.javascript?.overrides))
    .onResolved(scopeAntislop)
    .onResolved(pnpm)
    .toConfigs()
}
