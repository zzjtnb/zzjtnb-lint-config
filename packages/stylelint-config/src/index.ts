import type { Config } from 'stylelint'

import { fileOverrides } from './configs/files.js'
import { createIgnorePatterns } from './configs/ignores.js'
import { basePresets } from './configs/presets.js'
import { languageOptions } from './configs/syntax.js'
import { orderRules } from './rules/order.js'
import { sharedRules } from './rules/shared.js'

export type { Config } from 'stylelint'

const defaults = {
  extends: basePresets,
  // recess-order 注册排序插件，SCSS / Vue 预设在文件范围内注册 SCSS 插件；这里不重复注册。
  // monorepo 子包没有匹配样式时允许空输入；缓存目录和写回策略由消费方显式决定。
  allowEmptyInput: true,
  cache: false,
  fix: false,
  languageOptions,
  // disable 注释的维护性提示只报告 warning，不阻塞消费方的样式构建。
  // 缺少禁用原因。
  reportDescriptionlessDisables: [
    true,
    { severity: 'warning' },
  ],
  // 禁用范围引用了不存在的规则。
  reportInvalidScopeDisables: [
    true,
    { severity: 'warning' },
  ],
  // 禁用已经不再需要的规则。
  reportNeedlessDisables: [
    true,
    { severity: 'warning' },
  ],
  // 禁用了全部规则而未限定具体范围。
  reportUnscopedDisables: [
    true,
    { severity: 'warning' },
  ],
  rules: {
    ...sharedRules,
    ...orderRules,
  },
} satisfies Config

/** 将 Stylelint 允许的单值或数组值统一为数组。 */
function toArray<T>(value: T | T[] | undefined): T[] {
  return value === undefined
    ? []
    : Array.isArray(value)
      ? value
      : [value]
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
    extends: [
      ...toArray(base.extends),
      ...toArray(config.extends),
    ],
    plugins: [
      ...toArray(base.plugins),
      ...toArray(config.plugins),
    ],
    ignoreFiles: [
      ...toArray(base.ignoreFiles),
      ...toArray(config.ignoreFiles),
    ],
    rules: {
      ...base.rules,
      ...config.rules,
    },
    overrides: [
      ...(base.overrides ?? []),
      // 顶层 rules 不能覆盖已有 override 中的 rules；把消费方规则按调用顺序应用到全部文件，
      // 再追加消费方自己的文件级例外，才能兑现工厂“后续规则覆盖共享默认值”的契约。
      ...(config.rules
        ? [
            {
              files: ['**/*'],
              rules: config.rules,
            },
          ]
        : []),
      ...(config.overrides ?? []),
    ],
  }
}

/**
 * 创建 Stylelint 共享配置。
 *
 * Stylelint 配置文件本身仍需导出对象，因此工厂结果可直接用于 `export default`，
 * 也由默认导出提供给 Stylelint 原生 `extends` 解析。
 *
 * @param config 消费方的规则覆盖与追加配置；列表项追加，共享规则按规则名覆盖。
 * @param configs 按顺序追加的配置片段，后续同名规则优先。
 * @returns 可直接导出的 Stylelint 配置，默认忽略路径按本次调用的工作目录生成。
 */
export function zzjtnb(
  config: Partial<Config> = {},
  ...configs: Config[]
): Config {
  // 一个进程可能依次检查多个消费项目，不能缓存模块首次加载时的 CWD。
  const initialConfig: Config = {
    // 只复制本包持有的纯配置数据，隔离嵌套规则、语言模型与报告选项，防止跨调用污染。
    ...structuredClone(defaults),
    overrides: fileOverrides.map(({ customSyntax, ...settings }) => ({
      ...structuredClone(settings),
      // parser 含函数，是第三方共享实现而非可复制的配置数据，保留其模块实例。
      ...(customSyntax
        ? { customSyntax }
        : {}),
    })),
    ignoreFiles: createIgnorePatterns(),
  }
  return [config, ...configs].reduce(mergeConfigs, initialConfig)
}

/** Stylelint 原生 `extends` 解析使用的对象入口。 */
export default zzjtnb()
