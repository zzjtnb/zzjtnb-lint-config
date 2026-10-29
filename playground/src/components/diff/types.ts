import type { SandboxResult } from '../../../protocol'

/** 源码与修复对比；业务草稿及应用操作由调用方持有。 */
export interface DiffProps {
  /** 配置源码采用单列内联对比，代码修复保留左右两栏。 */
  kind?: 'config' | 'code'
  /** 决定修复对比的语言高亮。 */
  filename: string
  /** 本次操作之前的完整文本。 */
  original: string
  /** 本次操作返回的完整文本。 */
  modified: string
  /** 实验页允许编辑原始代码；配置变更对比保持只读。 */
  editable?: boolean
  /** 当前输入对应的引擎诊断，定位到原始或修复后模型。 */
  diagnostics?: SandboxResult['messages']
  /** 修复后剩余诊断使用右侧模型坐标。 */
  modifiedDiagnostics?: boolean
}
