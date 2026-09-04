import { execFile } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { describe, expect, it } from 'vitest'

import { cliPath } from '../helpers/cli.js'

const execFileAsync = promisify(execFile)
const root = fileURLToPath(new URL('../../', import.meta.url))
const directory = fileURLToPath(new URL('.', import.meta.url))
const config = fileURLToPath(new URL('../../vitest.config.ts', import.meta.url))
const vitestCli = cliPath('vitest')

describe('集成测试运行入口', () => {
  it('从仓库根或测试子目录指定根配置时发现相同的测试文件', async () => {
    // 只枚举测试文件，不执行子测试，避免递归运行当前用例。
    const args = [
      vitestCli,
      'list',
      '--filesOnly',
      '--json',
      '--config',
      config,
      '--project',
      'integration',
      '--project',
      'packages',
    ]
    const [fromRoot, fromDirectory] = await Promise.all([
      execFileAsync(process.execPath, args, { cwd: root }),
      execFileAsync(process.execPath, args, { cwd: directory }),
    ])
    const expected = JSON.parse(fromRoot.stdout)
    expect(expected).toContainEqual({
      file: fileURLToPath(new URL('./consumer-configs.test.ts', import.meta.url)),
      projectName: 'integration',
    })
    expect(expected).toContainEqual({
      file: fileURLToPath(new URL('./package-loading.test.ts', import.meta.url)),
      projectName: 'packages',
    })
    expect(JSON.parse(fromDirectory.stdout)).toEqual(expected)
  }, 30_000)
})
