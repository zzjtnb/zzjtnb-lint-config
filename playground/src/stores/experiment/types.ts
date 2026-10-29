import type { SandboxResult } from '../../../protocol'

/** 一次执行的对象、原始输入与结果，供诊断、修复和验证状态复用。 */
export interface Execution {
  /** 本次执行的虚拟相对路径，不随外层选择变化。 */
  filename: string
  /** 沙箱返回的正式结果。 */
  result: SandboxResult
  /** 工具、配置、源码和工作区的输入身份。 */
  identity: string
  /** 检查之前的源码，用于修复差异。 */
  original: string
  /** 操作类型，区分检查、修复和工作区性能。 */
  action: 'check' | 'fix' | 'stats' | 'files'
}
