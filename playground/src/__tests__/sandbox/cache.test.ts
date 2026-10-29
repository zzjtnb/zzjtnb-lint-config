import { Blob } from 'node:buffer'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
  // jsdom 未实现 Blob.stream，复用 Node 提供的标准 Blob 验证压缩缓存。
  vi.stubGlobal('Blob', Blob)
})

afterEach(() => vi.unstubAllGlobals())
it('二进制缓存恢复原字节，资源变化失效且只清理同工具旧版本', async () => {
  const { cacheKey, clearCache, restore, save } = await import('../../sandbox/cache')
  vi.stubGlobal('location', { href: 'https://playground.example/' })
  const stored = new Map<string, Response>()
  vi.stubGlobal('caches', {
    open: async () => ({
      put: async (key: string, response: Response) => { stored.set(key, new Response(await response.arrayBuffer())) },
      match: async (key: string) => stored.get(key)?.clone(),
      keys: async () => [
        ...stored.keys(),
      ].map(key => new Request(key)),
      delete: async (request: Request) => stored.delete(request.url),
    }),
  })
  const bytes = new Uint8Array([10, 0, 255, 90])
  const mount = vi.fn()
  const runtime = {
    export: vi.fn(async () => bytes),
    mount,
  }
  const first = await cacheKey('eslint', 'version-a')
  const second = await cacheKey('eslint', 'version-b')
  const style = await cacheKey('stylelint', 'version-a')
  expect(await restore(runtime, 'eslint', first)).toBe(false)
  expect(await save(runtime, 'eslint', first)).toBe(true)
  expect(await restore(runtime, 'eslint', first)).toBe(true)
  expect(new Uint8Array(mount.mock.calls.at(-1)![0])).toEqual(bytes)
  expect(mount.mock.calls.at(-1)![1]).toEqual({ mountPoint: 'eslint' })
  await save(runtime, 'stylelint', style)
  expect(await restore(runtime, 'eslint', second)).toBe(false)
  await save(runtime, 'eslint', second)
  expect(stored.has(first)).toBe(false)
  expect(stored.has(style)).toBe(true)
  expect(await clearCache()).toBe(2)
  expect(stored.size).toBe(0)
})
it('清理时等待已经开始的缓存写入，清理后本会话不再自动写入', async () => {
  const { clearCache, save } = await import('../../sandbox/cache')
  let finish!: (value: Uint8Array) => void
  const stored = new Map<string, Response>()
  vi.stubGlobal('caches', {
    open: async () => ({
      put: async (key: string, response: Response) => { stored.set(key, response) },
      keys: async () => [
        ...stored.keys(),
      ].map(key => new Request(key)),
      delete: async (request: Request) => stored.delete(request.url),
    }),
  })
  const runtime = {
    export: () => new Promise<Uint8Array>((resolve) => { finish = resolve }),
  }
  const writing = save(runtime, 'eslint', 'https://example.test/eslint-cache')
  const clearing = clearCache()
  finish(new Uint8Array([1]))
  await writing
  await clearing
  expect(stored.size).toBe(0)
  expect(await save(runtime, 'stylelint', 'https://example.test/stylelint-cache')).toBe(false)
})
it('损坏的压缩快照被移除，保留恢复错误供调用方回退安装', async () => {
  const remove = vi.fn(async () => true)
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async () => new Response('invalid gzip'),
      delete: remove,
    }),
  })
  const mount = vi.fn(async () => {})
  const { restore } = await import('../../sandbox/cache')
  await expect(restore({ mount }, 'eslint', 'corrupt-key')).rejects.toThrow()
  expect(remove).toHaveBeenCalledWith('corrupt-key')
  expect(mount).toHaveBeenCalledTimes(1)
})
