import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { loadAndConvertEnv } from '../src/utils/env'

let envDir: string

beforeAll(async () => {
  const temporaryRoot = resolve('.tmp/vite-config/env')
  await mkdir(temporaryRoot, { recursive: true })
  envDir = await mkdtemp(`${temporaryRoot}/case-`)
  await writeFile(resolve(envDir, '.env'), 'VITE_APP_TITLE=基础标题\nVITE_PORT=5173\n')
  await writeFile(resolve(envDir, '.env.staging'), `VITE_APP_TITLE=预发布标题\nVITE_PORT=0\nVITE_BASE=/staging/\nVITE_GLOB_TITLE=\${VITE_APP_TITLE}\n`)
  await writeFile(resolve(envDir, '.env.production'), 'VITE_APP_TITLE=生产标题\n')
})

afterEach(() => vi.unstubAllEnvs())

describe('应用环境配置', () => {
  it('以 Vite 的 mode 和环境目录为准，不从包管理器脚本猜测模式', async () => {
    vi.stubEnv('npm_lifecycle_script', 'vite build --mode production')
    const options = await loadAndConvertEnv('staging', envDir)
    expect(options.appTitle).toBe('预发布标题')
    expect(options.base).toBe('/staging/')
    expect(options.port).toBe(0)
    expect(options.env.VITE_GLOB_TITLE).toBe('预发布标题')
  })

  it('沿用 Vite 的进程环境优先级，并展开变量引用', async () => {
    vi.stubEnv('VITE_APP_TITLE', '终端标题')
    const options = await loadAndConvertEnv('staging', envDir)
    expect(options.appTitle).toBe('终端标题')
    expect(options.env.VITE_GLOB_TITLE).toBe('终端标题')
  })

  it.each([
    '-1',
    '1.5',
    '65536',
    'Infinity',
    'not-a-port',
    '',
  ])('拒绝无效的显式端口：%s', async (port) => {
    vi.stubEnv('VITE_PORT', port)
    await expect(loadAndConvertEnv('staging', envDir)).rejects.toThrow('VITE_PORT')
  })
})
