import { beforeEach, expect, it, vi } from 'vitest'

const { boot, spawn } = vi.hoisted(() => ({
  boot: vi.fn(),
  spawn: vi.fn(),
}))
vi.mock('@webcontainer/api', () => ({
  WebContainer: { boot },
}))
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('crossOriginIsolated', true)
  boot.mockResolvedValue({ spawn })
})
it('webContainer 启动失败后可由用户重试', async () => {
  boot.mockRejectedValueOnce(new Error('临时启动失败'))
  const { getSandbox } = await import('../../sandbox/client')
  await expect(getSandbox()).rejects.toThrow('临时启动失败')
  await expect(getSandbox()).resolves.toEqual({ spawn })
  expect(boot).toHaveBeenCalledTimes(2)
  vi.unstubAllGlobals()
})
it('工具进程启动失败后不缓存失败 Promise，用户重试可以启动', async () => {
  spawn.mockRejectedValueOnce(new Error('临时进程启动失败'))
  spawn.mockResolvedValueOnce({
    input: new WritableStream(),
    output: new ReadableStream({
      start(controller) { controller.enqueue('PLAYGROUND_READY\n') },
    }),
    exit: new Promise(() => {}),
  })
  const { startRunner } = await import('../../sandbox/client')
  await expect(startRunner('markdownlint')).rejects.toThrow('临时进程启动失败')
  await expect(startRunner('markdownlint')).resolves.toBeUndefined()
  expect(spawn).toHaveBeenCalledTimes(2)
  vi.unstubAllGlobals()
})
it('取消服务启动会终止进程，迟到的就绪消息不能覆盖取消状态', async () => {
  let output!: ReadableStreamDefaultController<string>
  const kill = vi.fn()
  spawn.mockResolvedValueOnce({
    input: new WritableStream(),
    output: new ReadableStream<string>({
      start(controller) { output = controller },
    }),
    exit: new Promise(() => {}),
    kill,
  })
  const controller = new AbortController()
  const { startRunner, runtimeStates } = await import('../../sandbox/client')
  const pending = startRunner('stylelint', 'example.scss', controller.signal)
  const rejected = expect(pending).rejects.toThrow('取消启动')
  await vi.waitFor(() => expect(spawn).toHaveBeenCalledOnce())
  controller.abort(new DOMException('取消启动', 'AbortError'))
  await rejected
  output.enqueue('PLAYGROUND_READY\n')
  await Promise.resolve()
  expect(kill).toHaveBeenCalledOnce()
  expect(runtimeStates.stylelint.phase).not.toBe('ready')
  output.close()
  vi.unstubAllGlobals()
})
