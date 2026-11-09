/** 在上游已启用 Vue 时补充无障碍默认值，不参与依赖检测或复制 Vue 规则。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { ESLintConfigOptions } from '../types'
import { vue } from '@antfu/eslint-config'

export async function vueAccessibility(configs: TypedFlatConfigItem[], options: ESLintConfigOptions['vue']) {
  const setup = configs.find(config => config.name === 'antfu/vue/setup')
  if (!setup || setup.plugins?.['vue-a11y'] || (typeof options === 'object' && options.a11y === false))
    return configs

  // 规则与插件均读取正式 helper，仅提取无障碍部分，保留消费方现有覆盖。
  const defaults = await vue({ a11y: true })
  const plugin = defaults[0]!.plugins!['vue-a11y']!
  const rules = Object.fromEntries(Object.entries(defaults[1]!.rules!).filter(([name]) => name.startsWith('vue-a11y/')))
  return configs.map(config => config.name === 'antfu/vue/setup'
    ? {
        ...config,
        plugins: { ...config.plugins, 'vue-a11y': plugin },
      }
    : config.name === 'antfu/vue/rules'
      ? {
          ...config,
          rules: {
            ...rules,
            ...config.rules,
          },
        }
      : config)
}
