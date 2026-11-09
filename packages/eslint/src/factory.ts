/** 公开 ESLint 工厂：组装 antfu 选项、本包差异与消费方后置覆盖。 */
import type { ConfigNames, TypedFlatConfigItem } from '@antfu/eslint-config'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types'

import antfu, { getOverrides } from '@antfu/eslint-config'
import { composer, FlatConfigComposer } from 'eslint-flat-config-utils'

import { antislopRules, scopeAntislop } from './configs/antislop'
import { ignores } from './configs/ignores'

import { overrideJavaScript } from './configs/javascript'
import { withOverrides } from './configs/overrides'
import { pnpm } from './configs/pnpm'
import { stylistic } from './configs/stylistic'
import { test } from './configs/test'
import { toml } from './configs/toml'
import { vueAccessibility } from './configs/vue'
import { plugins } from './plugins'

/**
 * 创建基于 antfu 的 ESLint Flat Config。
 *
 * 通过上游各集成的覆盖入口提供默认差异，保留语言作用域、声明文件豁免和后置配置顺序。
 * 不将语言覆盖重新追加到所有集成之后，避免反向盖掉 TypeScript 等专属规则。
 *
 * @param options 语言集成与共享规则选项，其中 rules 覆盖全部共享默认规则。
 * @param configs 追加的 Flat Config 片段，优先于首个选项对象中的规则。
 * @returns 可直接导出、await 或继续链式组合的上游 FlatConfigComposer。
 */
export function zzjtnb(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): ReturnType<typeof antfu> {
  // 仅移除本包私有字段；全局 rules、语言选项和后置配置均按 antfu 的正式入口处理。
  const { defaultIgnores, ...upstreamOptions } = options
  const base = antfu({
    ...upstreamOptions,
    // TypeScript、Vue 等集成不设置默认 true，由上游自动检测并处理显式开关。
    antislop: withOverrides(options.antislop, antislopRules, getOverrides(options, 'antislop')),
    ignores: ignores(options.ignores, defaultIgnores),
    linterOptions: { reportUnusedInlineConfigs: 'warn', ...options.linterOptions },
    // 通过正式集成入口补充规则，消费方的覆盖高于本包差异。
    test: withOverrides(options.test, test, getOverrides(options, 'test')),
    stylistic: withOverrides(options.stylistic, stylistic, getOverrides(options, 'stylistic')),
    toml: withOverrides(options.toml, toml, getOverrides(options, 'toml')),
  })
    .override('antfu/javascript/rules', config => overrideJavaScript(config, getOverrides(options, 'javascript')))
    .onResolved(configs => vueAccessibility(configs, options.vue))
    .onResolved(scopeAntislop)
    .onResolved(pnpm)

  // 只处理本包生成的配置；后置配置和链式覆盖均在内部回调完成后应用。
  const result = composer<TypedFlatConfigItem, ConfigNames>({
    name: 'zzjtnb/plugins',
    plugins: { ...plugins },
    rules: { 'zzjtnb/import-extensions': 'error' },
  }, base)
  for (const config of configs) {
    if (config instanceof FlatConfigComposer) {
      result.append(config)
    }
    else {
      result.append(Promise.resolve(config).then(value => Array.isArray(value)
        ? value
        : [value]))
    }
  }
  return result
}
