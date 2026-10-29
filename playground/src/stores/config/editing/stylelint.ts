import type { RuleLevel } from '../types'

/**
 * Stylelint 主参数与 severity 分别处理，不把级别当主参数。
 * @param value 已有主参数或完整规则数组。
 * @param level 关闭、警告或错误。
 * @returns 保留主参数和次选项的配置；缺少主参数时明确失败。
 */
export function changeLevel(value: unknown, level: RuleLevel): unknown {
  if (level === 'off')
    return null
  const primary = Array.isArray(value)
    ? value[0]
    : value
  if (primary == null || primary === false)
    throw new Error('此规则需要有效主参数，请先在 JSON 中填写正式参数，再设置级别')
  const secondary = Array.isArray(value)
    ? value[1]
    : undefined
  return [
    primary,
    {
      ...(secondary && typeof secondary === 'object'
        ? secondary
        : {}),
      severity: level === 'warn'
        ? 'warning'
        : 'error',
    },
  ]
}
