import type { SandboxResult } from '../../../protocol'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, expect, it, vi } from 'vitest'
import { runSandbox } from '../../sandbox/client'
import { useConfigStore, useExperimentStore } from '../../stores/index'

vi.mock('../../sandbox/client.ts', () => ({
  runSandbox: vi.fn(),
}))
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ rules: [], configs: [] }),
})))
beforeEach(() => {
  setActivePinia(createPinia())
  vi.mocked(runSandbox).mockReset()
})
const result: SandboxResult = {
  rules: {},
  configs: [],
  ignored: false,
  messages: [],
  output: 'fixed',
  duration: 1,
}
it('修复先预览，不覆盖输入；输入改变后不能应用旧结果', async () => {
  vi.mocked(runSandbox).mockResolvedValue(result)
  const experiment = useExperimentStore()
  const before = experiment.source
  await experiment.run('fix')
  expect(experiment.source).toBe(before)
  expect(experiment.current?.result.output).toBe('fixed')
  experiment.source = 'new input'
  expect(experiment.stale).toBe(true)
  experiment.applyFix()
  expect(experiment.source).toBe('new input')
})
it('迟到的旧结果不能覆盖切换后的工具', async () => {
  let complete!: (value: SandboxResult) => void
  vi.mocked(runSandbox).mockImplementation(() => new Promise((resolve) => {
    complete = resolve
  }))
  const config = useConfigStore()
  const experiment = useExperimentStore()
  const pending = experiment.run('check')
  config.selectMode('stylelint')
  complete(result)
  await pending
  expect(experiment.current).toBeUndefined()
  expect(experiment.running).toBe(false)
})
it('同一工具的不同文件各自保留执行结果，性能分析不覆盖诊断历史', async () => {
  const config = useConfigStore()
  const experiment = useExperimentStore()
  const first = config.draft.filename
  vi.mocked(runSandbox).mockResolvedValue({ ...result, output: 'first' })
  await experiment.run('check')
  config.draft.filename = 'other.ts'
  expect(experiment.current).toBeUndefined()
  vi.mocked(runSandbox).mockResolvedValue({ ...result, output: 'second' })
  await experiment.run('check')
  config.draft.filename = first
  expect(experiment.current?.result.output).toBe('first')
  expect(experiment.current?.filename).toBe(first)
})
it('旧输入的迟到失败不会覆盖当前文件的反馈', async () => {
  let reject!: (reason: Error) => void
  vi.mocked(runSandbox).mockImplementation(() => new Promise((_resolve, fail) => {
    reject = fail
  }))
  const experiment = useExperimentStore()
  const pending = experiment.run('check')
  experiment.source = 'new source'
  reject(new Error('旧输入错误'))
  await pending
  expect(experiment.error).toBe('')
})
it('已显示的错误随输入变化失效，恢复原输入时仍保留可复核反馈', async () => {
  vi.mocked(runSandbox).mockRejectedValue(new Error('当前语法错误'))
  const experiment = useExperimentStore()
  const original = experiment.source
  await experiment.run('check')
  expect(experiment.error).toBe('当前语法错误')
  experiment.source = 'different'
  expect(experiment.error).toBe('')
  experiment.source = original
  expect(experiment.error).toBe('当前语法错误')
})
it('性能分析独立保存，之后的单文件检查不覆盖性能数据', async () => {
  const experiment = useExperimentStore()
  vi.mocked(runSandbox).mockResolvedValue({ ...result, output: 'stats' })
  await experiment.run('stats')
  expect(experiment.current).toBeUndefined()
  expect(experiment.performanceRun?.result.output).toBe('stats')
  vi.mocked(runSandbox).mockResolvedValue({ ...result, output: 'checked' })
  await experiment.run('check')
  expect(experiment.current?.result.output).toBe('checked')
  expect(experiment.performanceRun?.result.output).toBe('stats')
})

it('文件匹配结果独立保存，选择文件或运行检查不清空，工作区变化后标为过期', async () => {
  const config = useConfigStore()
  const experiment = useExperimentStore()
  vi.mocked(runSandbox).mockResolvedValue({
    ...result,
    workspace: [
      {
        filename: 'module.ts',
        ignored: false,
        rules: {},
        messages: [],
        duration: 1,
      },
      {
        filename: 'module.js',
        ignored: false,
        rules: {
          'no-console': [2],
        },
        messages: [],
        duration: 1,
      },
    ],
  })
  await experiment.run('files')
  expect(experiment.matchingRun?.result.workspace).toHaveLength(2)
  experiment.selectFile('module.js')
  expect(experiment.matchingStale).toBe(false)
  expect(config.resolved?.rules['no-console']).toEqual([2])
  expect(config.resolvedCurrent).toBe(true)
  await experiment.run('check')
  expect(experiment.matchingRun?.result.workspace).toHaveLength(2)
  experiment.source = 'changed source'
  expect(experiment.matchingStale).toBe(true)
  expect(experiment.matchingRun?.result.workspace).toHaveLength(2)
  config.selectMode('stylelint')
  expect(experiment.matchingRun).toBeUndefined()
})

it('工作区性能结果不因预览另一个已有文件失效', async () => {
  const experiment = useExperimentStore()
  vi.mocked(runSandbox).mockResolvedValue(result)
  await experiment.run('stats')
  experiment.selectFile('module.js')
  expect(experiment.performanceStale).toBe(false)
  experiment.source = 'changed'
  expect(experiment.performanceStale).toBe(true)
})
it('重命名保留代码，拒绝覆盖已有路径及当前工具不支持的扩展名', () => {
  const config = useConfigStore()
  const experiment = useExperimentStore()
  experiment.source = 'const renamed = 42\n'
  expect(() => experiment.renameFile('module.js')).toThrow('已存在')
  expect(() => experiment.renameFile('../escape.ts')).toThrow('相对')
  expect(() => experiment.renameFile('custom.css')).toThrow('不支持')
  experiment.renameFile('src/renamed.ts')
  expect(config.draft.filename).toBe('src/renamed.ts')
  expect(experiment.source).toBe('const renamed = 42\n')
  expect(experiment.workspace['src/renamed.ts']).toBe('const renamed = 42\n')
})
it('重命名导入文件后仍可恢复原始导入内容', async () => {
  const experiment = useExperimentStore()
  await experiment.importFiles([
    new File(['original'], 'imported.ts'),
  ])
  experiment.selectFile('imported.ts')
  experiment.source = 'edited'
  experiment.renameFile('renamed.ts')
  expect(experiment.source).toBe('edited')
  expect(experiment.imported).toEqual({ 'renamed.ts': 'original' })
  experiment.reset()
  expect(experiment.source).toBe('original')
})
