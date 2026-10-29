/** 按工具资源内容缓存官方二进制文件系统，不在页面构造 node_modules 对象树。 */
import type { WebContainer } from '@webcontainer/api'

const name = 'playground-tool-filesystems-v1'
let paused = false
const writes = new Set<Promise<boolean>>()
/** 资源变化后使用新键；同一工具旧版本在新缓存写入成功后清理。 */
export async function cacheKey(mode: string, source: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source))
  const version = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
  return new URL(`runtime/cache/${mode}-${version}`, location.href).href
}

/** 恢复当前工具的完整二进制文件系统；没有缓存时由调用方正常安装。 */
export async function restore(runtime: Pick<WebContainer, 'mount'>, mode: string, key: string) {
  if (!('caches' in globalThis))
    return false
  const cache = await caches.open(name)
  const cached = await cache.match(key)
  if (!cached)
    return false
  await runtime.mount({
    [mode]: { directory: {} },
  })
  let snapshot: ArrayBuffer
  try {
    snapshot = await new Response(cached.body!.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  }
  catch (error) {
    await cache.delete(key)
    throw error
  }
  await runtime.mount(snapshot, { mountPoint: mode })
  return true
}

/** 等待已开始的写入并清理沙箱缓存；本页面会话暂停后续持久化，保留运行中的服务。 */
export async function clearCache(mode?: string) {
  if (!('caches' in globalThis))
    throw new Error('当前浏览器不支持沙箱持久化缓存')
  paused = true
  await Promise.allSettled([...writes])
  const cache = await caches.open(name)
  const keys = await cache.keys()
  let count = 0
  for (const request of keys) {
    if (mode && !new URL(request.url).pathname.split('/').pop()!.startsWith(`${mode}-`))
      continue
    if (await cache.delete(request))
      count++
  }
  return count
}

/** 在沙箱侧导出，再异步压缩缓存；缓存失败不改变已完成安装的检查能力。 */
export function save(runtime: Pick<WebContainer, 'export'>, mode: string, key: string): Promise<boolean> {
  if (!('caches' in globalThis) || paused)
    return Promise.resolve(false)
  const writing = (async () => {
    const snapshot = await runtime.export(mode, {
      format: 'binary',
      excludes: ['config-*.mjs', '.pnpm-store/**', '**/playground.cjs'],
    })
    const compressed = new Blob([snapshot as BlobPart]).stream().pipeThrough(new CompressionStream('gzip'))
    const cache = await caches.open(name)
    await cache.put(key, new Response(compressed))
    for (const request of await cache.keys()) {
      if (request.url !== key && new URL(request.url).pathname.split('/').pop()!.startsWith(`${mode}-`))
        await cache.delete(request)
    }
    return true
  })()
  writes.add(writing)
  return writing.finally(() => {
    writes.delete(writing)
  })
}
