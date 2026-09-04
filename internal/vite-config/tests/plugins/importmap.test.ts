import type { Plugin } from 'vite'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createGenerator } = vi.hoisted(() => ({
  createGenerator: vi.fn(),
}))
vi.mock('@jspm/generator', () => ({
  Generator: class {
    constructor(...args: unknown[]) {
      return createGenerator(...args)
    }
  },
}))

const { viteImportMapPlugin } = await import('../../src/plugins/importmap')

function fakeGenerator(name = 'vue') {
  return {
    install: vi.fn().mockResolvedValue(undefined),
    getMap: vi.fn().mockReturnValue({
      imports: { [name]: `https://example.com/${name}.js` },
    }),
  }
}

beforeEach(() => vi.resetAllMocks())

async function prepare(plugins: Plugin[], command: 'build' | 'serve' = 'build') {
  for (const plugin of plugins) {
    if (typeof plugin.config === 'function')
      await plugin.config.call({} as never, {}, { command, mode: 'production' })
  }
  for (const plugin of plugins) {
    if (typeof plugin.buildStart === 'function')
      await plugin.buildStart.call({} as never, {} as never)
    if (typeof plugin.resolveId === 'function')
      await plugin.resolveId.call({} as never, 'vue', undefined, {} as never)
  }
  for (const plugin of plugins) {
    if (typeof plugin.buildEnd === 'function')
      await plugin.buildEnd.call({} as never)
  }
}

async function render(plugins: Plugin[], html = '<html><head></head><body><script type="module" src="/entry.js"></script></body></html>') {
  const hook = plugins.find(plugin => plugin.name === 'importmap:html')!.transformIndexHtml
  if (!hook || typeof hook !== 'object' || !('handler' in hook))
    throw new Error('缺少 HTML 钩子')
  return hook.handler.call({} as never, html, {} as never)
}

describe('importmap 插件实例与失败边界', () => {
  it('依赖解析失败不能被当作成功构建', async () => {
    const generator = fakeGenerator()
    generator.install.mockRejectedValue(new Error('CDN 解析失败'))
    createGenerator.mockReturnValue(generator)
    const plugins = await viteImportMapPlugin({
      importmap: [
        { name: 'vue' },
      ],
    })
    await expect(prepare(plugins)).rejects.toThrow('CDN 解析失败')
  })

  it('多个插件实例独立持有生成器，不将后创建项目的映射写入前一个项目', async () => {
    const first = fakeGenerator('vue')
    const second = fakeGenerator('react')
    createGenerator.mockReturnValueOnce(first).mockReturnValueOnce(second)
    const firstPlugins = await viteImportMapPlugin({
      importmap: [
        { name: 'vue' },
      ],
    })
    const secondPlugins = await viteImportMapPlugin({
      importmap: [
        { name: 'react' },
      ],
    })
    await prepare(firstPlugins)
    await prepare(secondPlugins)
    expect(first.install).toHaveBeenCalledWith({ target: 'vue', range: undefined })
    expect(second.install).toHaveBeenCalledWith({ target: 'react', range: undefined })
    expect(JSON.stringify(await render(firstPlugins))).toContain('https://example.com/vue.js')
    expect(JSON.stringify(await render(secondPlugins))).toContain('https://example.com/react.js')
  })

  it('开发服务关闭不触发构建专属的安装失败检查', async () => {
    createGenerator.mockReturnValue(fakeGenerator())
    const plugins = await viteImportMapPlugin()
    await expect(prepare(plugins, 'serve')).resolves.toBeUndefined()
  })
})
