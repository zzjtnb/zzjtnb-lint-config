import type { SandboxRequest, SandboxResult } from '../protocol.ts'
import { applyFixes } from 'markdownlint-cli2/markdownlint'
import { lint } from 'markdownlint-cli2/markdownlint/promise'

/**
 * 读取引擎配置，应用 fixInfo 后重新检查，保留剩余诊断。
 * @param request 当前 Markdown 文件与操作。
 * @param url 配置模块地址。
 * @returns 真实诊断及修复文本。
 */
export async function execute(request: SandboxRequest, url: string): Promise<SandboxResult> {
  const { default: loaded } = await import(url)
  const config = {
    ...await loaded,
    ...request.overrides,
  }
  const check = (source: string) => lint({
    strings: { [request.filename]: source },
    config,
  })
  let results = request.action === 'inspect'
    ? {}
    : await check(request.source)
  let output = request.source
  if (request.action === 'fix') {
    output = applyFixes(request.source, results[request.filename]!)
    results = await check(output)
  }
  return {
    rules: config,
    configs: [
      {
        name: 'Markdownlint 当前配置（不推断继承链）',
        index: 1,
        files: ['**/*.md'],
        ignores: [],
        rules: config,
      },
    ],
    ignored: false,
    messages: (results[request.filename] ?? []).map(message => ({
      rule: message.ruleNames[0],
      message: `${message.ruleDescription}${message.errorDetail
        ? ` · ${message.errorDetail}`
        : ''}`,
      severity: 'severity' in message && message.severity === 'warning'
        ? 'warning'
        : 'error',
      line: message.lineNumber,
      column: message.errorRange?.[0],
    })),
    output,
    duration: 0,
  }
}
