import type { Linter } from 'eslint'
import type {
  ESLintConfigOptions,
  ESLintUserConfig,
} from './types.js'

import antfu from '@antfu/eslint-config'
import { plugin as shadcn } from '@shadcn/lint'

import { ignores } from './configs/ignores.js'
import { javascript } from './configs/javascript.js'
import { pnpm } from './configs/pnpm.js'
import { stylisticRules } from './configs/stylistic.js'
import { tomlRules } from './configs/toml.js'
import { vueRules } from './configs/vue.js'

export type * from './types.js'

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
): Promise<Linter.Config[]> {
  const {
    defaultIgnores,
    ignores: ignoreOverrides,
    imports: importsOptions = true,
    linterOptions,
    overrides = {},
    pnpm: pnpmOptions,
    rules,
    ...antfuOptions
  } = options
  const javascriptDefaults = javascript(linterOptions)

  return antfu(
    {
      // 只补公开的语言默认值与忽略策略，parser、插件、开关与文件范围仍由 antfu 负责。
      typescript: true,
      vue: true,
      ...antfuOptions,
      ignores: ignores(ignoreOverrides, defaultIgnores),
      pnpm: pnpmOptions,
      linterOptions: javascriptDefaults.linterOptions,
      // imports 的正式入口只有对象内部 overrides，不使用上游未声明的 overrides.imports。
      imports: importsOptions === false
        ? false
        : {
            ...(typeof importsOptions === 'object'
              ? importsOptions
              : {}),
            overrides: {
              // 允许从 dist 目录导入；后续上游文件级豁免和消费方设置继续生效。
              'antfu/no-import-dist': 'off',
              ...(typeof importsOptions === 'object'
                ? importsOptions.overrides
                : {}),
            },
          },
      // 默认值放在消费方分组覆盖之前；各对象自身的 overrides 再由 antfu 按正式顺序合并。
      // 这里只提供默认差异，不覆盖未修改的语言或复制推荐规则表。
      overrides: {
        ...overrides,
        javascript: {
          ...javascriptDefaults.rules,
          ...overrides.javascript,
        },
        stylistic: {
          ...stylisticRules,
          ...overrides.stylistic,
        },
        toml: {
          ...tomlRules,
          ...overrides.toml,
        },
        vue: {
          ...vueRules(),
          ...overrides.vue,
        },
      },
    },
    ...pnpm(pnpmOptions, options.yaml !== false),
    {
      name: 'zzjtnb/shadcn',
      plugins: { shadcn },
    },
    // 显式的全局规则保持高优先级；仅消费方主动提供时，才覆盖上游语言边界与豁免。
    ...(rules
      ? [
          { name: 'zzjtnb/rules', rules },
        ]
      : []),
    ...configs,
  ).toConfigs()
}
