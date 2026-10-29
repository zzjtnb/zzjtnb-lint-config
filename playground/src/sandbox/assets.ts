/** 按工具准备服务与依赖；同一工具的并发消费者共享准备结果。 */
import type { FileSystemTree } from '@webcontainer/api'
import type { PlaygroundMode } from '../../types'
import { cacheKey, clearCache, restore, save } from './cache'
import { getSandbox, runtimeLog, runtimeStates, startRunner, stopRunner } from './client'

const installing = new Map<PlaygroundMode, Promise<void>>()
const preparing = new Map<PlaygroundMode, Promise<void>>()
const controllers = new Map<PlaygroundMode, AbortController>()

/** 只取消指定工具的准备，不清理依赖、缓存或页面草稿。 */
export function cancelPreparation(mode: PlaygroundMode) {
  controllers.get(mode)?.abort(new DOMException('已取消当前工具准备，配置与代码草稿保留', 'AbortError'))
}
/** 安装或恢复单个工具依赖，不启动引擎；前后台请求复用同一安装。 */
function installRuntime(mode: PlaygroundMode, signal: AbortSignal) {
  if (installing.has(mode))
    return installing.get(mode)!
  let abort: () => void
  const interrupted = new Promise<never>((_resolve, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
  })
  const preparation = (async () => {
    signal.throwIfAborted()
    runtimeStates[mode] = { phase: 'preparing', message: '启动浏览器 Node.js…' }
    runtimeLog.value += `[${mode}] 准备检查环境…\n`
    const [runtime, response] = await Promise.race([
      Promise.all([
        getSandbox(),
        fetch(`${import.meta.env.BASE_URL}runtime/${mode}.json`, {
          cache: 'no-cache',
          signal: AbortSignal.any([
            signal,
            AbortSignal.timeout(120000),
          ]),
        }),
      ]),
      interrupted,
    ])
    if (!response.ok)
      throw new Error(`缺少 ${mode} 检查服务文件，请重新构建站点`)
    const source = await response.text()
    const key = await cacheKey(mode, source)
    signal.throwIfAborted()
    runtimeStates[mode] = { phase: 'preparing', message: `读取 ${mode} 本地依赖缓存…` }
    const restoreStarted = performance.now()
    let restored = false
    try {
      restored = await restore(runtime, mode, key)
    }
    catch (error) {
      runtimeLog.value += `[${mode}] 本地缓存恢复失败，将重新安装：${String(error)}\n`
    }
    signal.throwIfAborted()
    performance.measure(`playground:${mode}:restore`, {
      start: restoreStarted,
      end: performance.now(),
    })
    if (restored) {
      runtimeLog.value += `[${mode}] 已从本地缓存恢复依赖，无需联网安装 · ${((performance.now() - restoreStarted) / 1000).toFixed(1)} 秒\n`
    }
    else {
      runtimeStates[mode] = { phase: 'preparing', message: `准备 ${mode} 服务文件…` }
      const tree = JSON.parse(source) as FileSystemTree
      await runtime.mount({
        [mode]: { directory: tree },
      })
      signal.throwIfAborted()
      runtimeStates[mode] = { phase: 'preparing', message: `安装 ${mode} 检查依赖…` }
      runtimeLog.value += `[${mode}] 安装检查依赖…\n`
      runtimeLog.value += `[${mode}] 使用构建期锁文件，跳过传递依赖解析\n`
      const installStarted = performance.now()
      // WebContainer 的 pnpm 预填充存储在多个工具连续安装时会复用不完整索引；每个工具使用自己的存储目录，避免 Invalid package。
      const install = await runtime.spawn('pnpm', [
        'install',
        '--frozen-lockfile',
        '--ignore-scripts',
        '--store-dir',
        '.pnpm-store',
      ], { cwd: mode })
      const cancel = () => install.kill()
      signal.addEventListener('abort', cancel, { once: true })
      if (signal.aborted)
        cancel()
      try {
        signal.throwIfAborted()
        await Promise.race([
          install.output.pipeTo(new WritableStream({
            write(chunk) { runtimeLog.value += chunk },
          })),
          interrupted,
        ])
        const code = await install.exit
        signal.throwIfAborted()
        if (code !== 0)
          throw new Error(`${mode} 依赖安装失败（${code}）`)
      }
      finally { signal.removeEventListener('abort', cancel) }
      performance.measure(`playground:${mode}:install`, {
        start: installStarted,
        end: performance.now(),
      })
      runtimeLog.value += `[${mode}] 依赖安装成功 · ${((performance.now() - installStarted) / 1000).toFixed(1)} 秒\n`
    }
    signal.throwIfAborted()
    runtimeStates[mode] = { phase: 'installed', message: '依赖已准备，使用时启动检查服务' }
    if (!restored) {
      void save(runtime, mode, key).then((saved) => {
        if (saved)
          runtimeLog.value += `[${mode}] 依赖缓存已保存，下次进入可直接恢复\n`
      }).catch((error) => {
        runtimeLog.value += `[${mode}] 依赖缓存未保存：${String(error)}；当前服务可继续使用\n`
      })
    }
  })().catch((error) => {
    installing.delete(mode)
    throw error
  }).finally(() => { signal.removeEventListener('abort', abort) })
  installing.set(mode, preparation)
  return preparation
}

/** 当前工具安装完成并启动后才可执行检查；安装完成不等于引擎就绪。 */
export function prepareRuntime(mode: PlaygroundMode, filename?: string) {
  if (preparing.has(mode) && !['error', 'cancelled'].includes(runtimeStates[mode].phase))
    return preparing.get(mode)!
  const controller = new AbortController()
  controllers.set(mode, controller)
  const started = performance.now()
  const timer = setTimeout(() => controller.abort(new DOMException('准备超时（4 分钟），请检查网络后重试', 'TimeoutError')), 4 * 60 * 1000)
  const { signal } = controller
  const preparation = (async () => {
    await installRuntime(mode, signal)
    const startupStarted = performance.now()
    await startRunner(mode, filename, signal)
    signal.throwIfAborted()
    performance.measure(`playground:${mode}:startup`, {
      start: startupStarted,
      end: performance.now(),
    })
    performance.measure(`playground:${mode}:total`, {
      start: started,
      end: performance.now(),
    })
    runtimeLog.value += `[${mode}] 环境准备完成 · ${((performance.now() - started) / 1000).toFixed(1)} 秒\n`
    runtimeStates[mode] = { phase: 'ready', message: '浏览器引擎已就绪' }
  })().catch((error) => {
    preparing.delete(mode)
    const cause = signal.aborted ? signal.reason : error
    const cancelled = signal.aborted && cause.name === 'AbortError'
    runtimeLog.value += `[${mode}] ${cancelled ? '准备已取消' : '准备失败'}：${String(cause)}\n`
    runtimeStates[mode] = {
      phase: cancelled ? 'cancelled' : 'error',
      message: cancelled
        ? '准备已取消，配置与代码草稿保留，可重新准备'
        : `${mode} 引擎准备失败，保留草稿，可重试`,
    }
    throw cause
  }).finally(() => {
    clearTimeout(timer)
    controllers.delete(mode)
  })
  preparing.set(mode, preparation)
  return preparation
}

/** 重装当前工具：删除其持久化快照和沙箱目录，重新安装依赖，不修改页面草稿。 */
export async function resetRuntime(mode: PlaygroundMode, filename?: string) {
  await clearCache(mode)
  await stopRunner(mode)
  const runtime = await getSandbox()
  await runtime.fs.rm(mode, { recursive: true, force: true })
  installing.delete(mode)
  preparing.delete(mode)
  runtimeLog.value += `[${mode}] 重置沙箱，重新安装依赖并启动服务；配置与代码草稿保留\n`
  await prepareRuntime(mode, filename)
}

/** 当前工具就绪后顺序加载其他工具；前后台共用安装和服务启动。 */
export async function preinstallOthers(current: PlaygroundMode) {
  for (const mode of ['eslint', 'stylelint', 'markdownlint'] as const) {
    if (mode === current || installing.has(mode))
      continue
    runtimeLog.value += `[${mode}] 后台准备资源、依赖与检查服务…\n`
    try {
      await prepareRuntime(mode)
      runtimeLog.value += `[${mode}] 后台检查服务已就绪，切换时直接复用\n`
    }
    catch (error) {
      runtimeLog.value += `[${mode}] 后台准备失败，使用时可重试：${String(error)}\n`
    }
  }
}
