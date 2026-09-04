import type { Plugin, ResolvedConfig } from 'vite'

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readPackageJSON: vi.fn(),
  loadEnv: vi.fn(),
}))
vi.mock('@zzjtnb/node-utils', () => ({
  readPackageJSON: mocks.readPackageJSON,
  generatorContentHash: (source: string, size: number) => createHash('md5').update(source).digest('hex').slice(0, size),
}))
vi.mock('vite', () => ({ loadEnv: mocks.loadEnv }))

const { viteExtraAppConfigPlugin } = await import('../../src/plugins/extra-app-config')

beforeEach(() => {
  vi.resetAllMocks()
  mocks.readPackageJSON.mockResolvedValue({ version: '1.0.0' })
  mocks.loadEnv.mockReturnValue({ VITE_GLOB_TITLE: '运行配置' })
})

describe('运行时配置产物', () => {
  it('开发模式不读取配置或生成构建插件', async () => {
    expect(await viteExtraAppConfigPlugin({ isBuild: false })).toBeUndefined()
    expect(mocks.readPackageJSON).not.toHaveBeenCalled()
  })

  it('从 Vite 的最终模式、目录和项目根读取配置，HTML 与生成资产使用同一地址', async () => {
    const plugin = await viteExtraAppConfigPlugin({ isBuild: true }) as Plugin
    assert.ok(typeof plugin.configResolved === 'function')
    await plugin.configResolved.call({} as never, {
      mode: 'staging-east',
      envDir: '/project/environments',
      root: '/project/app',
      base: '/site/',
    } as ResolvedConfig)
    expect(mocks.readPackageJSON).toHaveBeenCalledWith('/project/app')
    expect(mocks.loadEnv).toHaveBeenCalledWith('staging-east', '/project/environments', 'VITE_GLOB_')
    const emitFile = vi.fn()
    assert.ok(typeof plugin.generateBundle === 'function')
    await plugin.generateBundle.call({ emitFile } as never, {} as never, {}, false)
    const asset = emitFile.mock.calls[0]![0]
    expect(asset.source).toContain('运行配置')
    assert.ok(typeof plugin.transformIndexHtml === 'function')
    const html = await plugin.transformIndexHtml.call({} as never, '<html></html>', {} as never)
    expect(html).toMatchObject({
      tags: [
        {
          attrs: { src: `/site/${asset.fileName}` },
        },
      ],
    })
  })

  it('产物写入失败传递给构建，而不是打印错误后继续', async () => {
    const { generateBundle } = await viteExtraAppConfigPlugin({ isBuild: true }) as Plugin
    // 类型收窄在回调内不会保留，因此先取出局部变量再断言。
    assert.ok(typeof generateBundle === 'function')
    expect(() => generateBundle.call({
      emitFile() { throw new Error('不能生成资产') },
    } as never, {} as never, {}, false)).toThrow('不能生成资产')
  })
})
