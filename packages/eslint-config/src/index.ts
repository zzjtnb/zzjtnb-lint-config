import type { Linter } from 'eslint'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types.js'

import antfu from '@antfu/eslint-config'

import {
  defaultFormatters,
  defaultLinterOptions,
  defaultMarkdown,
  defaultStylistic,
  ignores,
  javascript,
  resolveIgnores,
  vueRuleConfig,
} from './configs/index.js'

export {
  defaultFormatters,
  defaultIgnores,
  defaultLinterOptions,
  defaultMarkdown,
  defaultStylistic,
  ignores,
  javascript,
  jsonc,
  node,
  organizationOverrides,
  perfectionist,
  pnpm,
  ruleOverrides,
  rules,
  typescript,
  yaml,
} from './configs/index.js'
export type {
  ESLintConfigOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from './types.js'

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
    ignores: ignoreOverrides = [],
    jsonc = true,
    markdown = defaultMarkdown,
    node: nodeEnabled = true,
    pnpm: pnpmEnabled = true,
    pnpmWorkspace = true,
    rules = {},
    stylistic = defaultStylistic,
    toml = true,
    typescript = true,
    unocss = false,
    vue = true,
    yaml = true,
    formatters = defaultFormatters,
    linterOptions = defaultLinterOptions,
    ...antfuOptions
  } = options

  const baseIgnores = await ignores()
  const pnpm = pnpmEnabled === false
    ? false
    : {
        json: jsonc !== false,
        sort: pnpmWorkspace,
        yaml: yaml !== false && pnpmWorkspace,
        ...(pnpmEnabled === true ? {} : pnpmEnabled),
      }

  return antfu(
    {
      ...antfuOptions,
      formatters,
      ignores: resolveIgnores(ignoreOverrides, defaultIgnores ?? baseIgnores),
      jsonc,
      markdown,
      node: nodeEnabled,
      pnpm,
      stylistic,
      toml,
      typescript,
      unocss,
      vue,
      yaml,
    },
    ...(await javascript(rules, linterOptions)),
    ...(vue === false ? [] : [vueRuleConfig]),
    ...configs,
  ).toConfigs()
}

/** 纯 JavaScript / TypeScript 配置，默认关闭 Vue 和 UnoCSS。 */
export async function base(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return zzjtnb({ vue: false, unocss: false, ...options }, ...configs)
}

/** Vue 项目配置；其余默认集成保持不变。 */
export async function vue(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return zzjtnb({ vue: true, ...options }, ...configs)
}

/** 显式启用 UnoCSS；消费方必须自行安装可选 peer。 */
export async function uno(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return zzjtnb({ unocss: true, ...options }, ...configs)
}

/**
 * 默认导出与命名导出 `zzjtnb` 指向同一个配置工厂，避免消费者
 * 因为默认导入和命名导入的选择不同而遇到入口不一致的问题。
 */
export default zzjtnb
