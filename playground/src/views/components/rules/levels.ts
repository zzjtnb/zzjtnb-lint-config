import type { RuleItem } from '../../../../types'

// 规则配置的处理方式，不表示当前代码已有诊断，也不是开关按钮。
export const ruleLevels: Record<RuleItem['status'], { label: string, description: string }> = {
  error: { label: '违规时报错', description: '违反这条规则的代码会被报告为错误。这不代表当前代码已有错误。' },
  warn: { label: '违规时警告', description: '违反这条规则的代码会被报告为警告。这不代表当前代码已有警告。' },
  off: { label: '未启用', description: '这条规则不参与当前文件的检查，不会产生错误或警告。' },
}
