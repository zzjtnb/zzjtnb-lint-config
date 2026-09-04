import { execFile } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { packageCheckSteps } from '../packages.js'
import { compareVersions, isNextVersion, parseVersion } from '../version.js'

const execFileAsync = promisify(execFile)

describe('发布流程的本地边界', () => {
  it.each([
    '1.2.3-beta',
    '1.2.3suffix',
    '01.2.3',
    '1.2.3.4',
    '9007199254740992.0.0',
  ])('不把非法或不支持的版本误当作稳定版本：%s', (version) => {
    expect(() => parseVersion(version)).toThrow()
  })

  it('按数字比较稳定版本，不按字符串排序', () => {
    expect(parseVersion('1.2.3')).toEqual([1, 2, 3])
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0)
    expect(isNextVersion('1.2.4', '1.2.3')).toBe(true)
    expect(isNextVersion('1.3.0', '1.2.3')).toBe(true)
    expect(isNextVersion('2.0.0', '1.2.3')).toBe(true)
    expect(isNextVersion('1.2.5', '1.2.3')).toBe(false)
  })

  it('无需构建的 Markdownlint 包不插入构建或类型生成步骤', () => {
    const steps = packageCheckSteps(['@zzjtnb/markdownlint-config'])
    expect(steps).toHaveLength(2)
    expect(steps.flatMap(([, args]) => args)).not.toContain('build')
    expect(steps.flatMap(([, args]) => args)).not.toContain('typecheck')
  })

  it('帮助命令不需要终端，也不启动登录或发布', async () => {
    const script = fileURLToPath(new URL('../index.js', import.meta.url))
    const result = await execFileAsync(process.execPath, [script, '--help'], {
      env: { ...process.env, CI: '1' },
    })
    expect(result.stdout).toContain('用法：pnpm release')
    expect(result.stderr).toBe('')
  })

  it('非交互环境在任何登录或发布操作前退出', async () => {
    const script = fileURLToPath(new URL('../index.js', import.meta.url))
    await expect(execFileAsync(process.execPath, [script], {
      env: { ...process.env, CI: '1' },
    }))
      .rejects.toMatchObject({
        code: 1,
        stderr: expect.stringContaining('发布需要真实交互终端'),
      })
  })
})
