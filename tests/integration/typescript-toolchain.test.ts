import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

describe('typeScript CLI 与工具 API 共存', () => {
  it('编译器入口提供 TS7', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../node_modules/@typescript/native/package.json', import.meta.url), 'utf8'))
    const cli = fileURLToPath(new URL(`../../node_modules/@typescript/native/${manifest.bin.tsc}`, import.meta.url))
    const version = execFileSync(process.execPath, [cli, '--version'], { cwd: root, encoding: 'utf8' })
    expect(manifest.version).toMatch(/^7\./)
    expect(version.trim()).toBe(`Version ${manifest.version}`)
  })

  it('工具消费者可调用兼容编译器 API', () => {
    expect(ts.versionMajorMinor).toBe('6.0')
    const result = ts.transpileModule('const value: number = 1', {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
      reportDiagnostics: true,
    })
    expect(result.diagnostics).toEqual([])
    expect(result.outputText).toContain('const value = 1')
  })
})
