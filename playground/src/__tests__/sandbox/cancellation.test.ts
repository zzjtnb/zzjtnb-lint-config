import { expect, it, vi } from 'vitest'

vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: async () => ({
      spawn: async () => {
        let finish!: (code: number) => void
        return {
          input: new WritableStream(),
          output: new ReadableStream({
            start(controller) { controller.enqueue('PLAYGROUND_READY\n') },
          }),
          exit: new Promise<number>((resolve) => { finish = resolve }),
          kill: () => finish(0),
        }
      },
    }),
  },
}))
vi.mock('../../sandbox/assets.ts', () => ({
  prepareRuntime: async () => {},
}))

it('取消正在执行的服务后不继续显示已就绪', async () => {
  vi.stubGlobal('crossOriginIsolated', true)
  const { runSandbox, runtimeLog, runtimeStates } = await import('../../sandbox/client')
  const controller = new AbortController()
  const execution = runSandbox({
    mode: 'markdownlint',
    config: '',
    overrides: {},
    filename: 'test.md',
    source: '# Test',
    action: 'check',
  }, controller.signal)
  const failure = expect(execution).rejects.toThrow('操作已取消')
  await vi.waitFor(() => expect(runtimeLog.value).toContain('执行 markdownlint check'))
  expect(runtimeStates.markdownlint.phase).toBe('running')
  controller.abort(new Error('操作已取消'))
  await failure
  expect(runtimeStates.markdownlint.message).toContain('取消')
  expect(runtimeStates.markdownlint.phase).toBe('cancelled')
  vi.unstubAllGlobals()
})
