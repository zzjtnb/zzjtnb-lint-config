import { createPinia, setActivePinia } from 'pinia'
import { expect, it, vi } from 'vitest'
import { useConfigStore, useExperimentStore } from '../../stores/index'

vi.mock('../../sandbox/client.ts', () => ({
  runSandbox: vi.fn(),
}))
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ rules: [], configs: [] }),
})))
it('导入文件保存原文，选择后修改在工作区中保持，不把不支持文件丢失', async () => {
  setActivePinia(createPinia())
  const config = useConfigStore()
  const experiment = useExperimentStore()
  const files = [
    new File(['const value = 1'], 'src/example.ts'),
    new File(['data'], 'photo.png'),
  ]
  await experiment.importFiles(files)
  experiment.selectFile('src/example.ts')
  expect(experiment.source).toBe('const value = 1')
  experiment.source = 'const changed = 2'
  experiment.selectFile('module.ts')
  experiment.selectFile('src/example.ts')
  expect(experiment.source).toBe('const changed = 2')
  expect(experiment.supportedFiles['src/example.ts']).toBe('const changed = 2')
  expect(experiment.unsupportedFiles).toContain('photo.png')
  config.selectMode('markdownlint')
  expect(experiment.unsupportedFiles).toContain('src/example.ts')
})
it('同路径重新导入更新原文和检查输入，不继续使用旧编辑副本', async () => {
  setActivePinia(createPinia())
  const experiment = useExperimentStore()
  await experiment.importFiles([
    new File(['first'], 'example.ts'),
  ])
  experiment.selectFile('example.ts')
  experiment.source = 'edited'
  await experiment.importFiles([
    new File(['second'], 'example.ts'),
  ])
  expect(experiment.source).toBe('second')
  expect(experiment.supportedFiles['example.ts']).toBe('second')
  experiment.source = 'third'
  experiment.reset()
  expect(experiment.source).toBe('second')
})
it('清除导入后移除编辑副本并恢复示例预览，文件不残留在检查范围', async () => {
  setActivePinia(createPinia())
  const config = useConfigStore()
  const experiment = useExperimentStore()
  await experiment.importFiles([
    new File(['original'], 'imported.ts'),
  ])
  experiment.selectFile('imported.ts')
  experiment.source = 'edited'
  experiment.clearFiles()
  expect(config.draft.filename).toBe('module.ts')
  expect(experiment.imported).toEqual({})
  expect(experiment.workspace).not.toHaveProperty('imported.ts')
  await experiment.importFiles([
    new File(['new'], 'imported.ts'),
  ])
  experiment.selectFile('imported.ts')
  expect(experiment.source).toBe('new')
})
it('重命名共享导入文件时同步其他工具的路径，保留各自编辑内容', async () => {
  setActivePinia(createPinia())
  const config = useConfigStore()
  const experiment = useExperimentStore()
  await experiment.importFiles([
    new File(['<style></style>'], 'shared.vue'),
  ])
  experiment.selectFile('shared.vue')
  experiment.source = '<style>.eslint {}</style>'
  config.selectMode('stylelint')
  experiment.selectFile('shared.vue')
  experiment.source = '<style>.stylelint {}</style>'
  config.selectMode('eslint')
  experiment.renameFile('renamed.vue')
  config.selectMode('stylelint')
  expect(config.draft.filename).toBe('renamed.vue')
  expect(experiment.source).toBe('<style>.stylelint {}</style>')
  expect(experiment.workspace).not.toHaveProperty('shared.vue')
})
