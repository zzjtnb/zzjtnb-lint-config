import stylelint from 'stylelint'
import { describe, expect, it, vi } from 'vitest'

import { zzjtnb } from '../../packages/stylelint-config/src/index.js'
import { getMetadata, parseRequest, runLint } from '../plugins/engine.ts'
import { configurations } from '../src/data/configs'

describe('本地 lint 运行器', () => {
  it.each(['eslint', 'stylelint', 'markdownlint'] as const)('使用真实引擎检查并修复示例：%s', async (mode) => {
    const example = configurations[mode].examples[0]!
    const input = {
      mode,
      filename: example.filename,
      code: example.code,
      fix: false,
    }
    const result = await runLint(input)
    expect(result.diagnostics.length).toBeGreaterThan(0)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
    const fixed = await runLint({ ...input, fix: true })
    expect(fixed.output).not.toBe(example.code)
    const next = await runLint({ ...input, code: fixed.output })
    expect(next.diagnostics).toEqual(fixed.diagnostics)
  }, 30_000)

  it.each(['eslint', 'stylelint', 'markdownlint'] as const)('规则元数据来自实际解析结果：%s', async (mode) => {
    const file = configurations[mode].examples[0]!.filename
    const result = await getMetadata(mode, file)
    expect(result.mode).toBe(mode)
    expect(result.filename).toBe(file)
    expect(result.version).toMatch(/^\d+\./)
    expect(result.rules.length).toBeGreaterThan(20)
    expect(result.rules.every(rule => rule.files === file)).toBe(true)
  }, 30_000)

  it('修复 TOML 时仍保留 Schema 指令', async () => {
    const result = await runLint({
      mode: 'eslint',
      filename: 'sample.toml',
      code: '#:schema https://developers.openai.com/codex/config-schema.json\nname= "demo"\n',
      fix: true,
    })
    expect(result.output.split('\n')[0]).toBe('#:schema https://developers.openai.com/codex/config-schema.json')
  })

  it.each([
    ['非对象', null],
    [
      '未知工具',
      {
        mode: 'constructor',
        filename: 'sample.ts',
        code: '',
        fix: false,
      },
    ],
    [
      '任意路径',
      {
        mode: 'eslint',
        filename: '../../package.json',
        code: '',
        fix: false,
      },
    ],
    [
      '非文本代码',
      {
        mode: 'eslint',
        filename: 'sample.ts',
        code: 1,
        fix: false,
      },
    ],
    [
      '非布尔修复开关',
      {
        mode: 'eslint',
        filename: 'sample.ts',
        code: '',
        fix: 'true',
      },
    ],
    [
      '超限中文文本',
      {
        mode: 'eslint',
        filename: 'sample.ts',
        code: '字'.repeat(30_000),
        fix: false,
      },
    ],
  ])('拒绝未知目标、任意路径与超限文本：%s', (_label, value) => {
    expect(() => parseRequest(value)).toThrow()
  })

  it('stylelint 规则级别遵循原生 severity 与 defaultSeverity，而不是 ESLint 的严重级别位置', async () => {
    const config = await stylelint.resolveConfig('sample.html', {
      config: zzjtnb({
        defaultSeverity: 'warning',
        rules: {
          'color-no-invalid-hex': [
            true,
            { severity: 'warning' },
          ],
          'block-no-empty': true,
          'rule-empty-line-before': [
            'always',
            { severity: 'error' },
          ],
        },
      }),
    })
    const resolve = vi.spyOn(stylelint, 'resolveConfig').mockResolvedValueOnce(config)
    try {
      const result = await getMetadata('stylelint', 'sample.html')
      const severity = (name: string) => result.rules.find(rule => rule.name === name)?.status
      expect(severity('color-no-invalid-hex')).toBe('warn')
      expect(severity('block-no-empty')).toBe('warn')
      expect(severity('rule-empty-line-before')).toBe('error')
      expect(severity('no-empty-source')).toBe('off')
    }
    finally {
      resolve.mockRestore()
    }
  })

  it('引擎配置失效时不把空代码诊断冒充检查通过', async () => {
    // 使用真实 Stylelint 生成配置错误结果，再替换本次调用，验证适配边界而非伪造结果结构。
    const invalid = await stylelint.lint({
      code: '.sample { color: red; }',
      codeFilename: 'sample.css',
      config: {
        rules: { 'no-empty-source': 'error' },
      },
    })
    expect(invalid.results[0]?.invalidOptionWarnings).toHaveLength(1)
    const run = vi.spyOn(stylelint, 'lint').mockResolvedValueOnce(invalid)
    try {
      await expect(runLint({
        mode: 'stylelint',
        filename: 'sample.css',
        code: '.sample { color: red; }',
        fix: false,
      })).rejects.toThrow('Stylelint 配置无效')
    }
    finally {
      run.mockRestore()
    }
  })

  it('待检查代码仅参与静态分析，不执行程序', async () => {
    const result = await runLint({
      mode: 'eslint',
      filename: 'sample.js',
      code: 'throw new Error("不应执行")\n',
      fix: false,
    })
    expect(result.output).toContain('不应执行')
  }, 30_000)
})
