import { expect, it, vi } from 'vitest'

const { runtime, spawn } = vi.hoisted(() => {
  const spawn = vi.fn(async () => {
    let exited!: (code: number) => void
    const exit = new Promise<number>((resolve) => {
      exited = resolve
    })
    const output = new ReadableStream<string>({
      start(controller) { controller.enqueue('PLAYGROUND_READY\n') },
    })
    return {
      input: new WritableStream(),
      output,
      exit,
      kill: vi.fn(() => exited(0)),
    }
  })
  return {
    runtime: {
      spawn,
      teardown: vi.fn(),
    },
    spawn,
  }
})
vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: async () => runtime,
  },
}))
vi.mock('../../sandbox/assets.ts', () => ({
  prepareRuntime: vi.fn(async () => {}),
}))

it('重启检查服务保留同一运行时与已安装依赖', async () => {
  vi.stubGlobal('crossOriginIsolated', true)
  const { getSandbox, startRunner, restartRuntime } = await import('../../sandbox/client')
  const before = await getSandbox()
  await startRunner('eslint')
  await restartRuntime('eslint')
  expect(await getSandbox()).toBe(before)
  expect(runtime.teardown).not.toHaveBeenCalled()
  expect(spawn).toHaveBeenCalledTimes(2)
})
