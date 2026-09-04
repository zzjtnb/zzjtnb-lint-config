export type PlaygroundMode = 'eslint' | 'stylelint' | 'markdownlint'
export type WorkspaceView = 'code' | 'config' | 'rules'

export interface Example {
  // 仅使用工作台允许的虚拟文件名，不对应服务端真实文件写入。
  filename: string
  // 文件类型的可读说明。
  label: string
  // 可编辑的初始示例。
  code: string
}

export interface PlaygroundConfig {
  // 配置包的工具名称。
  name: string
  // 对外发布的完整包名。
  packageName: string
  // 工具负责的检查范围。
  summary: string
  // 配置文件的约定名称。
  configFile: string
  // 用于配置编辑器的语言标识。
  language: string
  // 可直接复制的消费方配置。
  config: string
  // 消费方安装命令，不由页面自动执行。
  install: string
  // 消费项目在根目录执行的检查命令。
  command: string
  // 对应的正式使用文档。
  docs: string
  // 允许在本地运行器中检查的示例与文件类型。
  examples: Example[]
}

export interface RuleItem {
  // 引擎实际配置中的规则标识。
  name: string
  // 插件名称或规则分类。
  category: string
  // 引擎提供的规则说明。
  description: string
  // 当前生效规则对应的文件名。
  files: string
  // 引擎实际解析的严重级别。
  status: 'error' | 'off' | 'warn'
  // 规则实际配置的 JSON 表示。
  value: string
  // 引擎提供的官方文档链接；未知时不生成猜测地址。
  url?: string
}

export interface ToolMetadata {
  // 请求对应的工具。
  mode: PlaygroundMode
  // 请求对应的虚拟文件。
  filename: string
  // 当前运行的 lint 引擎版本。
  version: string
  // 引擎为此文件实际解析的规则。
  rules: RuleItem[]
}

export interface Diagnostic {
  // 一基起始行号；未知位置时不提供。
  line?: number
  // 一基起始列号；未知位置时不提供。
  column?: number
  // 规则标识；解析错误可能没有规则名。
  rule?: string
  // 引擎原始诊断说明。
  message: string
  // 引擎原始诊断级别。
  severity: 'error' | 'warning'
}

export interface LintRequest {
  // 选择的工具，不接受任意模块名。
  mode: PlaygroundMode
  // 选择的示例文件名，由服务端白名单约束。
  filename: string
  // 仅作为待检查文本解析，不作为配置或程序执行。
  code: string
  // 是否应用引擎正式支持的自动修复。
  fix: boolean
}

export interface LintResult {
  // 检查对应的工具。
  mode: PlaygroundMode
  // 检查对应的虚拟文件。
  filename: string
  // 最终文本；修复模式下为引擎修复后的内容。
  output: string
  // 最终文本上的真实诊断。
  diagnostics: Diagnostic[]
  // 服务端实际测量的处理耗时，单位为毫秒。
  durationMs: number
}
