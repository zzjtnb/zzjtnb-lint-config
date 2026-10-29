import type { RuleItem } from '../../types'

import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** 独立生成脚本共享的仓库坐标与包解析上下文，不进入浏览器产物。 */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
export const require = createRequire(import.meta.url)

/**
 * 解析 ESLint/Markdownlint 的规则级别；Stylelint 的主选项不是严重级别，独立处理。
 * @param value 引擎约定的规则值或规则数组。
 * @returns 用于检查器展示的严重级别。
 */
export function severity(value: unknown): RuleItem['status'] {
  const level = Array.isArray(value)
    ? value[0]
    : value
  if (!level || level === 'off')
    return 'off'
  return level === 1 || level === 'warn'
    ? 'warn'
    : 'error'
}
