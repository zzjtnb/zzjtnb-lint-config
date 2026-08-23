import type { Linter } from 'eslint'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types.js'

import antfu from '@antfu/eslint-config'

import {
  defaultFormatters,
  defaultMarkdown,
  defaultStylistic,
  defaultLinterOptions,
  organizationOverrides,
  ignores,
  javascript,
  resolveIgnores,
} from './configs/index.js'

export {
  defaultFormatters,
  defaultIgnores,
  defaultMarkdown,
  defaultStylistic,
  defaultLinterOptions,
  organizationOverrides,
  ruleOverrides,
  rules,
  ignores,
  javascript,
  jsonc,
  node,
  perfectionist,
  pnpm,
  typescript,
  yaml,
} from './configs/index.js'
export type {
  ESLintConfigOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from './types.js'

/**
 * 创建基于 antfu 的组织级 ESLint Flat Config。
 *
 * antfu 负责插件注册和基础规则，本包只追加组织级差异，不重复维护
 * Vue、TypeScript、JSONC、YAML、Node 和 perfectionist 的基础实现。
 */
export async function defineConfig(
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

  return antfu(
    {
      ...antfuOptions,
      formatters,
      ignores: resolveIgnores(ignoreOverrides, defaultIgnores ?? baseIgnores),
      jsonc: jsonc === true ? false : jsonc,
      markdown,
      node: false,
      pnpm: pnpmEnabled === true ? false : pnpmEnabled,
      stylistic,
      toml,
      typescript: typescript === true ? false : typescript,
      unocss,
      vue: vue === true ? false : vue,
      yaml: yaml === true ? false : yaml,
    },
    ...(await javascript(rules, linterOptions)),
    ...(await organizationOverrides({
      jsonc: jsonc === true,
      node: nodeEnabled === true,
      pnpm: pnpmEnabled === true,
      pnpmWorkspace,
      typescript: typescript === true,
      vue: vue === true,
      yaml: yaml === true,
    })),
    ...configs,
  ).toConfigs()
}

/** 纯 JavaScript / TypeScript 配置，默认关闭 Vue 和 UnoCSS。 */
export async function base(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return defineConfig({ vue: false, unocss: false, ...options }, ...configs)
}

/** Vue 项目配置；其余默认集成保持不变。 */
export async function vue(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return defineConfig({ vue: true, ...options }, ...configs)
}

/** 显式启用 UnoCSS；消费方必须自行安装可选 peer。 */
export async function uno(
  options: ESLintConfigOptions = {},
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]> {
  return defineConfig({ unocss: true, ...options }, ...configs)
}
