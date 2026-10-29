export type PlaygroundMode = 'eslint' | 'stylelint' | 'markdownlint'

export interface RuleSource {
  /** 声明该规则的配置项名称。 */
  name: string
  /** 配置项在原始配置序列中的位置，从 1 开始。 */
  index: number
  /** 声明中的文件匹配模式；空数组表示没有局部 files 限制。 */
  files: unknown[]
  /** 此配置项声明的规则值，不等于最终合并值。 */
  value: string
}

export interface RuleItem {
  /** 引擎和插件提供的规则标识。 */
  name: string
  /** 核心引擎或插件命名空间。 */
  category: string
  /** 引擎提供的说明；没有元数据时为空字符串，不伪造描述。 */
  description: string
  /** 当前快照对应的虚拟文件。 */
  files: string
  /** 当前文件最终规则级别；未出现在配置中时为 off，configured 为 false。 */
  status: 'error' | 'off' | 'warn'
  /** 当前文件是否实际配置该规则。 */
  configured: boolean
  /** 最终配置值的 JSON；未配置时为 null。 */
  value: string
  /** 官方文档链接，未知时不提供。 */
  url?: string
  /** 是否提供自动修复；只有真实规则元数据声明时为 true。 */
  fixable?: boolean
  /** 是否被推荐预设标记为推荐；未知时不提供。 */
  recommended?: boolean
  /** 是否废弃，来自规则元数据。 */
  deprecated?: boolean
  /** 上游声明的参数 schema；缺失时不伪造参数表单。 */
  schema?: unknown
  /** 上游明确给出的默认参数。 */
  defaultOptions?: unknown
  /** 原始配置中的规则声明，按覆盖顺序排列，不冒充当前文件的匹配结果。 */
  sources: RuleSource[]
}

export interface ConfigItem {
  /** 配置项名称，未命名时使用明确的位置标签。 */
  name: string
  /** 原始配置序列中的位置，从 1 开始。 */
  index: number
  /** 局部文件匹配条件。 */
  files: unknown[]
  /** 配置项声明的忽略条件。 */
  ignores: unknown[]
  /** 配置声明注册的插件命名空间，不复制可执行插件对象。 */
  plugins?: string[]
  /** 语言与解析器选项，函数仅显示身份描述。 */
  languageOptions?: Record<string, unknown>
  /** Linter 自身的检查行为配置。 */
  linterOptions?: Record<string, unknown>
  /** 插件共享设置，保留原始数据语义。 */
  settings?: Record<string, unknown>
  /** 处理器的名称或身份描述。 */
  processor?: string
  /** ESLint 多语言插件声明的语言标识。 */
  language?: string
  /** 该配置项的原始规则声明。 */
  rules: Record<string, unknown>
}

export interface ToolMetadata {
  /** 快照所属工具。 */
  mode: PlaygroundMode
  /** 实际解析的虚拟文件。 */
  filename: string
  /** 构建时安装的引擎版本。 */
  version: string
  /** 当前引擎及已加载插件的规则定义。 */
  rules: RuleItem[]
  /** 可取得的原始配置项；不伪造未公开的预设继承链。 */
  configs: ConfigItem[]
}

export interface SetupScripts {
  /** 对应 package.json 的 lint:<工具名> 检查脚本。 */
  lint: string
  /** 对应 package.json 的 format:<工具名> 自动修复脚本。 */
  format: string
}

export interface PlaygroundConfig {
  /** 工具名称。 */
  name: string
  /** 配置包名称。 */
  packageName: string
  /** 工具适用范围。 */
  summary: string
  /** 消费方配置文件名。 */
  configFile: string
  /** 配置示例语言。 */
  language: string
  /** 消费方接入配置示例。 */
  config: string
  /** 安装命令。 */
  install: string
  /** 推荐写入 package.json 的标准 scripts。 */
  scripts: SetupScripts
  /** 正式文档地址。 */
  docs: string
  /** 构建时解析的文件类型，不维护待执行代码草稿。 */
  targets: { filename: string, label: string }[]
}
