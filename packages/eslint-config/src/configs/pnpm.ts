import type { Linter } from 'eslint'
import type { ESLintPnpmOptions } from '../types.js'
import { existsSync } from 'node:fs'

import { dirname, join } from 'node:path'

import process from 'node:process'

/**
 * 从当前工作目录向上查找 `pnpm-workspace.yaml`。
 *
 * 判断条件与 antfu 的 `pnpm` 默认值一致，保证本包是否追加覆盖与上游是否启用集成同步。
 */
function hasWorkspaceFile(): boolean {
  for (let directory = process.cwd(); ; directory = dirname(directory)) {
    if (existsSync(join(directory, 'pnpm-workspace.yaml'))) {
      return true
    }
    if (dirname(directory) === directory) {
      return false
    }
  }
}

/**
 * pnpm 工作区策略覆盖。
 *
 * pnpm 的 parser、规则、排序和全部选项均由 antfu 处理；本包只关闭会被 fix
 * 自动写入 `pnpm-workspace.yaml` 的工作区策略规则。
 * @param options 上游 pnpm 集成选项；未指定时与上游一致，仅在祖先目录存在 `pnpm-workspace.yaml` 时启用。
 * @param yamlEnabled 顶层 YAML 集成是否启用；pnpm 对象自身的 yaml 值优先于该值，与 antfu 的选项组装顺序一致。
 * @returns 仅作用于工作区清单的覆盖；pnpm 集成或 YAML 集成未启用时返回空数组。
 */
export function pnpm(
  options?: boolean | ESLintPnpmOptions,
  yamlEnabled = true,
): Linter.Config[] {
  // antfu 先根据顶层 yaml 计算默认值，再让 pnpm 对象覆盖。二者都关闭时不匹配 YAML，
  // 否则仅含 off 规则的片段也会把该文件重新纳入检查，并错误地交给 JavaScript parser。
  const enableYaml = typeof options === 'object'
    ? options.yaml ?? yamlEnabled
    : yamlEnabled
  if (!(options ?? hasWorkspaceFile()) || !enableYaml) {
    return []
  }

  return [
    {
      name: 'zzjtnb/pnpm',
      // antfu 的 pnpm parser 只匹配根级 workspace 文件，覆盖必须使用相同范围。
      files: ['pnpm-workspace.yaml'],
      rules: {
        // 禁止 ESLint fix 自动添加 pnpm 工作区策略。
        'pnpm/yaml-enforce-settings': 'off',
      },
    },
  ]
}
