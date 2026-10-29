/**
 * 工作台使用的 CLI2 转导出签名，不声明未使用的完整引擎选项。
 * sandbox/markdownlint.test.ts 对照实际引擎的官方类型与运行结果验证；
 * CLI2 发布正式声明后移除此适配，不添加底层引擎直接依赖。
 */
declare module 'markdownlint-cli2/markdownlint' {
  /** 引擎返回的完整诊断；原对象继续传给自动修复，不重建或丢弃修复信息。 */
  export interface LintError {
    lineNumber: number
    ruleNames: string[]
    ruleDescription: string
    ruleInformation: string | null
    errorDetail: string | null
    errorContext: string | null
    errorRange: number[] | null
    fixInfo: {
      lineNumber?: number
      editColumn?: number
      deleteCount?: number
      insertText?: string
    } | null
    severity: 'error' | 'warning'
  }
  /** 返回 CLI2 实际使用的引擎版本。 */
  export function getVersion(): string
  /** 根据原始诊断的 fixInfo 修复文本。 */
  export function applyFixes(input: string, errors: LintError[]): string
}

declare module 'markdownlint-cli2/markdownlint/promise' {
  import type { LintError } from 'markdownlint-cli2/markdownlint'

  /** 检查工作台的虚拟文件；非法配置等引擎错误继续向调用方抛出。 */
  export function lint(options: {
    strings: Record<string, string>
    config: Record<string, unknown>
  }): Promise<Record<string, LintError[]>>
  /** 加载并解析共享规则配置。 */
  export function readConfig(
    file: string,
    parsers?: ((text: string) => Record<string, unknown>)[],
  ): Promise<Record<string, unknown>>
}

declare module 'markdownlint-cli2/parsers/jsonc' {
  /** 使用 CLI2 自带 JSONC 解析器；解析错误由原实现抛出。 */
  const parse: (text: string) => Record<string, unknown>
  export default parse
}
