import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import process from 'node:process'
import { describe, it } from 'node:test'

import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { packageCheckSteps, ROOT } from '../packages.js'
import { compareVersions, isNextVersion, parseVersion } from '../version.js'

const execFileAsync = promisify(execFile)

describe('发布流程的本地边界', () => {
  for (const version of [
    '1.2.3-beta',
    '1.2.3suffix',
    '01.2.3',
    '1.2.3.4',
    '9007199254740992.0.0',
  ]) {
    it(`不把非法或不支持的版本误当作稳定版本：${version}`, () => {
      assert.throws(() => parseVersion(version))
    })
  }

  it('按数字比较稳定版本，不按字符串排序', () => {
    assert.deepStrictEqual(parseVersion('1.2.3'), [1, 2, 3])
    assert.ok(compareVersions('1.10.0', '1.9.0') > 0)
    assert.strictEqual(isNextVersion('1.2.4', '1.2.3'), true)
    assert.strictEqual(isNextVersion('1.3.0', '1.2.3'), true)
    assert.strictEqual(isNextVersion('2.0.0', '1.2.3'), true)
    assert.strictEqual(isNextVersion('1.2.5', '1.2.3'), false)
  })

  it('Markdownlint CLI2 入口也执行构建、类型检查和单次测试', () => {
    const steps = packageCheckSteps(['@zzjtnb/markdownlint-config'])
    assert.strictEqual((steps).length, 4)
    assert.ok((steps.flatMap(([, args]) => args)).includes('build'))
    assert.ok((steps.flatMap(([, args]) => args)).includes('typecheck'))
    assert.deepStrictEqual(steps[2][1].slice(-3), ['run', 'test', '--run'])
    assert.deepStrictEqual(steps[3][1], ['--dir', ROOT, 'run', 'lint'])
  })

  it('多个包分别构建、检查类型和执行测试，再统一运行根检查', () => {
    const steps = packageCheckSteps(['@zzjtnb/eslint-config', '@zzjtnb/stylelint-config'])
    assert.deepStrictEqual(steps.map(([, args]) => args.at(-1)), [
      'build',
      'typecheck',
      '--run',
      'build',
      'typecheck',
      '--run',
      'lint',
    ])
    assert.deepStrictEqual(steps.at(-1)[1], ['--dir', ROOT, 'run', 'lint'])
  })

  it('帮助命令不需要终端，也不启动登录或发布', async () => {
    const script = fileURLToPath(new URL('../index.js', import.meta.url))
    const result = await execFileAsync(process.execPath, [script, '--help'], {
      env: { ...process.env, CI: '1' },
    })
    assert.ok((result.stdout).includes('用法：pnpm release'))
    assert.strictEqual(result.stderr, '')
  })

  it('非交互环境在任何登录或发布操作前退出', async () => {
    const script = fileURLToPath(new URL('../index.js', import.meta.url))
    await assert.rejects(execFileAsync(process.execPath, [script], {
      env: { ...process.env, CI: '1' },
    }), error => error.code === 1 && error.stderr.includes('发布需要真实交互终端'))
  })
})
