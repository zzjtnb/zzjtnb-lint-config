import type { SandboxResult } from '../../../protocol'

/** 编辑器仅管理 UI，不读取业务 Store 或执行配置。 */
export interface EditorProps {
  /** 完整文本；调用方持有唯一可写草稿。 */
  modelValue: string
  /** 对应当前输入的真实引擎诊断。 */
  diagnostics?: SandboxResult['messages']
  /** 决定语言模式的虚拟文件名。 */
  filename: string
  /** 提供给辅助技术的编辑区名称。 */
  label: string
}
