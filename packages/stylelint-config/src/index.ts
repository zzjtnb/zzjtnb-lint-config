import type { Config } from 'stylelint'

import { baseExtends, resolveConfig } from './configs/extends.js'
import { defaultIgnoreFiles } from './configs/ignore-files.js'
import { languageOptions } from './configs/language.js'
import {
  allowEmptyInput,
  cache,
  fix,
  reportDescriptionlessDisables,
  reportInvalidScopeDisables,
  reportNeedlessDisables,
  reportUnscopedDisables,
} from './configs/options.js'
import { overrides } from './configs/overrides.js'
import { rules } from './configs/rules.js'

export type { Config } from 'stylelint'

const defaultConfig = {
  extends: baseExtends,
  // 使用包自身解析出的插件路径，避免 Stylelint 从消费方项目根目录解析依赖。
  plugins: [resolveConfig('stylelint-order')],
  allowEmptyInput,
  cache,
  fix,
  languageOptions,
  reportDescriptionlessDisables,
  reportInvalidScopeDisables,
  reportNeedlessDisables,
  reportUnscopedDisables,
  rules,
  ignoreFiles: defaultIgnoreFiles,
  overrides,
} satisfies Config

/** 将 Stylelint 允许的单值或数组值统一为数组。 */
function toArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value]
}

/**
 * 合并共享默认值与消费方配置。
 *
 * Stylelint 的规则对象需要按规则名覆盖，其他可叠加的配置项则统一追加；这样
 * `zzjtnb(config, ...configs)` 的行为和 ESLint 配置工厂保持一致。
 */
function mergeConfigs(base: Config, config: Partial<Config>): Config {
  return {
    ...base,
    ...config,
    extends: [...toArray(base.extends), ...toArray(config.extends)],
    plugins: [...toArray(base.plugins), ...toArray(config.plugins)],
    ignoreFiles: [...toArray(base.ignoreFiles), ...toArray(config.ignoreFiles)],
    rules: {
      ...base.rules,
      ...config.rules,
    },
    overrides: [
      ...(base.overrides ?? []),
      ...(config.overrides ?? []),
    ],
  }
}

/**
 * 创建 Stylelint 共享配置。
 *
 * Stylelint 配置文件本身仍需导出对象，因此工厂结果可直接用于 `export default`，
 * 也由默认导出提供给 Stylelint 原生 `extends` 解析。
 */
export function zzjtnb(
  config: Partial<Config> = {},
  ...configs: Config[]
): Config {
  return [config, ...configs].reduce(mergeConfigs, defaultConfig)
}

/** Stylelint 原生 `extends` 解析使用的对象入口。 */
export default zzjtnb()
