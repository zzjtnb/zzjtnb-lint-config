import type { Linter } from 'eslint'

import type { ESLintPnpmOptions } from '../types.js'

/**
 * pnpm 工作区策略覆盖。
 *
 * pnpm 的 parser、规则、排序和全部选项均由 antfu 处理；本包只关闭会被 fix
 * 自动写入 `pnpm-workspace.yaml` 的工作区策略规则。
 */
export function pnpm(
  options: boolean | ESLintPnpmOptions | undefined = true,
): Linter.Config[] {
  // yaml=false 时 antfu 不会注册 pnpm YAML 插件，不能引用它的规则。
  if (options === false || (typeof options === 'object' && options.yaml === false)) {
    return []
  }

  return [
    {
      files: ['pnpm-workspace.yaml', '**/pnpm-workspace.yaml'],
      rules: {
        // 禁止 ESLint fix 自动添加 pnpm 工作区策略。
        'pnpm/yaml-enforce-settings': 'off',
      },
    },
  ]
}
