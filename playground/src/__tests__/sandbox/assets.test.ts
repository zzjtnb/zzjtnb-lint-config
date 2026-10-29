import type { RuntimeState } from '../../sandbox/client'
import { beforeEach, expect, it, vi } from 'vitest'

const { mount, spawn, ready, log, states, restore, save, clear, stop, remove } = vi.hoisted(() => ({
  clear: vi.fn(async () => 1),
  stop: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  restore: vi.fn(async () => false),
  save: vi.fn(async () => false),
  mount: vi.fn(async () => {}),
  spawn: vi.fn(),
  ready: vi.fn(async () => {}),
  log: { value: '' },
  states: {} as Record<string, RuntimeState>,
}))
vi.mock('../../sandbox/cache.ts', () => ({
  cacheKey: async (mode: string) => mode,
  restore,
  save,
  clearCache: clear,
}))
vi.mock('../../sandbox/client.ts', () => ({
  getSandbox: async () => ({
    mount,
    spawn,
    fs: { rm: remove },
  }),
  stopRunner: stop,
  startRunner: ready,
  runtimeStates: states,
  runtimeLog: log,
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  restore.mockResolvedValue(false)
  log.value = '启动 WebContainer…\n'
  spawn.mockImplementation(async () => ({
    output: new ReadableStream({
      start(controller) { controller.close() },
    }),
    exit: Promise.resolve(0),
  }))
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
    'package.json': {
      file: { contents: '{}' },
    },
  }))))
})
it('命中持久化缓存时恢复服务，不重新安装依赖', async () => {
  restore.mockResolvedValue(true)
  const { prepareRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('stylelint')
  expect(spawn).not.toHaveBeenCalled()
  expect(ready).toHaveBeenCalledWith('stylelint', undefined, expect.any(AbortSignal))
  expect(log.value).toContain('已从本地缓存恢复依赖')
})
it('重置只移除当前工具并重新安装，不重复安装其他工具', async () => {
  const { prepareRuntime, resetRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('eslint')
  await prepareRuntime('stylelint')
  await resetRuntime('eslint', 'module.ts')
  expect(clear).toHaveBeenCalledWith('eslint')
  expect(stop).toHaveBeenCalledWith('eslint')
  expect(remove).toHaveBeenCalledExactlyOnceWith('eslint', { recursive: true, force: true })
  expect(spawn.mock.calls.map(call => call[2].cwd)).toEqual(['eslint', 'stylelint', 'eslint'])
  expect(ready).toHaveBeenLastCalledWith('eslint', 'module.ts', expect.any(AbortSignal))
})
it('当前工具就绪后顺序加载其他工具，切换复用已启动引擎', async () => {
  const { prepareRuntime, preinstallOthers } = await import('../../sandbox/assets')
  await prepareRuntime('eslint')
  await preinstallOthers('eslint')
  expect(spawn.mock.calls.map(call => call[2].cwd)).toEqual(['eslint', 'stylelint', 'markdownlint'])
  expect(ready).toHaveBeenNthCalledWith(1, 'eslint', undefined, expect.any(AbortSignal))
  expect(ready).toHaveBeenNthCalledWith(2, 'stylelint', undefined, expect.any(AbortSignal))
  expect(ready).toHaveBeenNthCalledWith(3, 'markdownlint', undefined, expect.any(AbortSignal))
  expect(states.stylelint).toEqual({ phase: 'ready', message: '浏览器引擎已就绪' })
  await prepareRuntime('stylelint', 'sample.scss')
  expect(spawn).toHaveBeenCalledTimes(3)
  expect(ready).toHaveBeenCalledTimes(3)
})
it('后台预安装失败不影响当前工具，前台进入时可重试', async () => {
  const { prepareRuntime, preinstallOthers } = await import('../../sandbox/assets')
  await prepareRuntime('eslint')
  spawn.mockResolvedValueOnce({
    output: new ReadableStream({
      start(controller) { controller.close() },
    }),
    exit: Promise.resolve(1),
  })
  await preinstallOthers('eslint')
  expect(states.eslint).toEqual({ phase: 'ready', message: '浏览器引擎已就绪' })
  expect(log.value).toContain('后台准备失败')
  expect(states.stylelint?.phase).toBe('error')
  await prepareRuntime('stylelint')
  expect(ready).toHaveBeenLastCalledWith('stylelint', undefined, expect.any(AbortSignal))
})
it('只准备进入的工具，同工具并发和再次进入不重复安装', async () => {
  const { prepareRuntime } = await import('../../sandbox/assets')
  await Promise.all([
    prepareRuntime('eslint'),
    prepareRuntime('eslint'),
  ])
  await prepareRuntime('eslint')
  expect(fetch).toHaveBeenCalledOnce()
  expect(vi.mocked(fetch).mock.calls[0]![0]).toContain('/runtime/eslint.json')
  expect(mount).toHaveBeenCalledWith({
    eslint: {
      directory: {
        'package.json': {
          file: { contents: '{}' },
        },
      },
    },
  })
  expect(spawn).toHaveBeenCalledExactlyOnceWith('pnpm', [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--store-dir',
    '.pnpm-store',
  ], { cwd: 'eslint' })
  expect(ready).toHaveBeenCalledExactlyOnceWith('eslint', undefined, expect.any(AbortSignal))
  expect(log.value).toContain('启动 WebContainer…')
  expect(log.value.indexOf('安装检查依赖…')).toBeLessThan(log.value.indexOf('依赖安装成功'))
})
it('切换工具独立安装，返回已准备的工具复用依赖与服务', async () => {
  const { prepareRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('eslint')
  await prepareRuntime('stylelint')
  await prepareRuntime('eslint')
  expect(spawn).toHaveBeenCalledTimes(2)
  expect(spawn).toHaveBeenLastCalledWith('pnpm', [
    'install',
    '--frozen-lockfile',
    '--ignore-scripts',
    '--store-dir',
    '.pnpm-store',
  ], { cwd: 'stylelint' })
  expect(ready).toHaveBeenLastCalledWith('stylelint', undefined, expect.any(AbortSignal))
})
it('启动服务采用首次所选文件，后续切换不重复运行整组预热', async () => {
  const { prepareRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('eslint', 'src/custom.vue')
  await prepareRuntime('eslint', 'module.js')
  expect(ready).toHaveBeenCalledExactlyOnceWith('eslint', 'src/custom.vue', expect.any(AbortSignal))
  expect(spawn).toHaveBeenCalledTimes(1)
})
it('工具准备可独立并行，不能互相覆盖文件与状态', async () => {
  const { prepareRuntime } = await import('../../sandbox/assets')
  await Promise.all([
    prepareRuntime('stylelint'),
    prepareRuntime('markdownlint'),
  ])
  expect(states.stylelint).toEqual({ phase: 'ready', message: '浏览器引擎已就绪' })
  expect(states.markdownlint).toEqual({ phase: 'ready', message: '浏览器引擎已就绪' })
  expect(spawn.mock.calls.map(call => call[2].cwd).sort()).toEqual(['markdownlint', 'stylelint'])
})
it('安装失败暴露错误，不启动服务且允许当前工具重试', async () => {
  spawn.mockResolvedValueOnce({
    output: new ReadableStream({
      start(controller) { controller.close() },
    }),
    exit: Promise.resolve(1),
  })
  const { prepareRuntime } = await import('../../sandbox/assets')
  await expect(prepareRuntime('eslint')).rejects.toThrow('eslint 依赖安装失败（1）')
  expect(ready).not.toHaveBeenCalled()
  expect(states.eslint?.phase).toBe('error')
  expect(log.value).toContain('依赖安装失败（1）')
  expect(log.value).not.toContain('依赖安装成功')
  await prepareRuntime('eslint')
  expect(ready).toHaveBeenCalledOnce()
})
it('取消依赖安装会终止当前工具进程，保留其他工具且可重新准备', async () => {
  const kill = vi.fn()
  spawn.mockResolvedValueOnce({
    output: new ReadableStream(),
    exit: new Promise(() => {}),
    kill,
  })
  const assets = await import('../../sandbox/assets')
  expect(assets).toHaveProperty('cancelPreparation')
  const pending = assets.prepareRuntime('eslint')
  const rejected = expect(pending).rejects.toThrow('已取消')
  await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
  assets.cancelPreparation('eslint')
  await rejected
  expect(kill).toHaveBeenCalledOnce()
  expect(ready).not.toHaveBeenCalled()
  expect(states.eslint?.phase).toBe('cancelled')
  await assets.prepareRuntime('eslint')
  expect(states.eslint?.phase).toBe('ready')
})

it('依赖安装停滞超过四分钟时终止进程并给出可重试错误', async () => {
  vi.useFakeTimers()
  const kill = vi.fn()
  spawn.mockResolvedValueOnce({
    output: new ReadableStream(),
    exit: new Promise(() => {}),
    kill,
  })
  try {
    const { prepareRuntime } = await import('../../sandbox/assets')
    const pending = prepareRuntime('stylelint')
    const rejected = expect(pending).rejects.toThrow('准备超时')
    await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
    await vi.advanceTimersByTimeAsync(4 * 60 * 1000)
    await rejected
    expect(kill).toHaveBeenCalledOnce()
    expect(states.stylelint?.phase).toBe('error')
  }
  finally { vi.useRealTimers() }
})

it('缓存保存失败只记录原因，不把可用引擎改为失败', async () => {
  save.mockRejectedValueOnce(new Error('缓存空间不足'))
  const { prepareRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('markdownlint')
  await vi.waitFor(() => expect(log.value).toContain('缓存空间不足'))
  expect(states.markdownlint?.phase).toBe('ready')
})
it('服务退出后重新准备会复用已安装依赖并重新启动服务', async () => {
  const { prepareRuntime } = await import('../../sandbox/assets')
  await prepareRuntime('eslint')
  states.eslint = { phase: 'error', message: '服务已退出' }
  await prepareRuntime('eslint')
  expect(spawn).toHaveBeenCalledOnce()
  expect(ready).toHaveBeenCalledTimes(2)
  expect(states.eslint?.phase).toBe('ready')
})
