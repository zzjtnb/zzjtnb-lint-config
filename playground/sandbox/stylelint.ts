import type { SandboxRequest, SandboxResult } from '../protocol.ts'
import { resolve } from 'node:path'
import stylelint from 'stylelint'

/**
 * 按 Stylelint 正式合并语义加载配置与最后一层规则覆盖。
 * @param request 当前文件与操作。
 * @param url 配置模块地址。
 * @returns 引擎解析值和诊断；不虚构 extends 来源链。
 */
export async function execute(request: SandboxRequest, url: string): Promise<SandboxResult> {
  const { default: loaded } = await import(url)
  const base = await loaded
  const config = {
    ...base,
    overrides: [
      ...(base.overrides ?? []),
      {
        files: ['**/*'],
        rules: request.overrides,
      },
    ],
  }
  const filename = resolve(request.filename)
  const resolved = await stylelint.resolveConfig(filename, { config })
  // 配置解析使用空输入读取原生忽略状态，不检查用户源码，不自行复制 ignoreFiles 匹配规则。
  const result = await stylelint.lint({
    code: request.action === 'inspect'
      ? ''
      : request.source,
    codeFilename: filename,
    config,
    fix: request.action === 'fix',
  })
  const ignored = result.results[0]?.ignored ?? false
  return {
    rules: ignored
      ? {}
      : resolved?.rules ?? {},
    configs: [
      {
        name: 'Stylelint 最终解析配置（非继承链）',
        index: 1,
        files: [request.filename],
        ignores: resolved?.ignoreFiles
          ? [resolved.ignoreFiles].flat()
          : [],
        rules: resolved?.rules ?? {},
      },
    ],
    ignored,
    messages: (request.action === 'inspect'
      ? []
      : result.results).flatMap(item => [
      ...item.warnings,
      ...item.parseErrors,
      ...item.invalidOptionWarnings,
    ].map(message => ({
      rule: 'rule' in message && typeof message.rule === 'string'
        ? message.rule
        : undefined,
      message: message.text,
      severity: 'severity' in message && message.severity === 'warning'
        ? 'warning' as const
        : 'error' as const,
      line: 'line' in message && typeof message.line === 'number'
        ? message.line
        : undefined,
      column: 'column' in message && typeof message.column === 'number'
        ? message.column
        : undefined,
    }))),
    output: request.action === 'inspect'
      ? request.source
      : result.code ?? request.source,
    duration: 0,
  }
}
