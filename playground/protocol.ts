import type { ConfigItem, PlaygroundMode } from './types.ts'

/** 浏览器交给沙箱的独立操作；源码只用于检查，不作为程序执行。 */
export interface SandboxRequest {
  mode: PlaygroundMode
  filename: string
  config: string
  overrides: Record<string, unknown>
  source: string
  action: 'inspect' | 'check' | 'fix' | 'stats' | 'files'
  /** 用户明确导入或当前沙箱示例文件，不扫描本机目录。 */
  files?: Record<string, string>
}

/** 保留引擎诊断原文与真实位置。 */
export interface Diagnostic {
  rule?: string
  message: string
  severity: 'error' | 'warning'
  line?: number
  column?: number
  endLine?: number
  endColumn?: number
}

/** 引擎针对当前文件解析的结果；配置声明不冒充匹配链。 */
export interface SandboxResult {
  rules: Record<string, unknown>
  configs: ConfigItem[]
  ignored: boolean
  messages: Diagnostic[]
  output: string
  duration: number
  timings?: { name: string, milliseconds: number, rule?: string, plugin?: string, filename?: string }[]
  /** ESLint 正式统计中的规则、解析、修复与总检查耗时，单位 ms。 */
  performance?: { rules: number, parse: number, fix: number, total: number }
  /** 原始配置条件通过 ConfigArray 匹配到的序号，不由最终规则倒推。 */
  matchedConfigs?: number[]
  workspace?: { filename: string, ignored: boolean, rules: Record<string, unknown>, matchedConfigs?: number[], messages: Diagnostic[], duration: number, performance?: SandboxResult['performance'], timings?: SandboxResult['timings'] }[]
}
