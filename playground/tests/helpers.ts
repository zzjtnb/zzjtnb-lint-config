import type { LintRequest } from '../types'

import { vi } from 'vitest'

/**
 * 为界面单测提供可控的 HTTP 响应；真实引擎行为由 engine.test.ts 单独验证。
 * @returns 可追踪读取和检查意图的 fetch 替身。
 */
export function apiMock() {
  return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    if (url.pathname.endsWith('/meta')) {
      const filename = url.searchParams.get('filename')!
      return Response.json({
        mode: url.searchParams.get('mode'),
        filename,
        version: '1.0.0',
        rules: [
          {
            name: 'example-rule',
            category: '测试',
            description: '界面测试规则',
            files: filename,
            status: 'error',
            value: '[2]',
          },
          {
            name: 'disabled-rule',
            category: '测试',
            description: '默认关闭的规则',
            files: filename,
            status: 'off',
            value: '[0]',
          },
        ],
      })
    }
    const request = JSON.parse(String(init?.body)) as LintRequest
    return Response.json({
      mode: request.mode,
      filename: request.filename,
      output: request.fix ? 'const answer = 42\n' : request.code,
      diagnostics: request.fix
        ? []
        : [
            {
              line: 1,
              column: 1,
              rule: 'example-rule',
              message: '界面测试诊断',
              severity: 'error',
            },
          ],
      durationMs: 12,
    })
  })
}
