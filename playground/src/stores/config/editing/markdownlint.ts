import type { RuleLevel } from '../types'

/**
 * Markdownlint 使用布尔开关或选项对象，不虚构规则警告级别。
 * @param value 已有规则配置。
 * @param level 用户启用或关闭意图。
 * @returns 布尔值或原有选项对象。
 */
export function changeLevel(value: unknown, level: RuleLevel): unknown {
  if (level === 'warn')
    throw new Error('Markdownlint 不支持在此处设置 ESLint 式警告级别')
  return level === 'off'
    ? false
    : value === false || value == null
      ? true
      : value
}
