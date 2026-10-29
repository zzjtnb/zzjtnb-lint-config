import type { RuleLevel } from '../types'

/**
 * 只替换 ESLint 规则级别，保留全部原有选项。
 * @param value 当前完整规则值。
 * @param level 用户选择的级别。
 * @returns ESLint 正式规则数组。
 */
export function changeLevel(value: unknown, level: RuleLevel): unknown {
  return [
    level,
    ...(Array.isArray(value)
      ? value.slice(1)
      : []),
  ]
}
