import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportConfig } from '../../stores/config/editing/source'
import { useConfigStore } from '../../stores/config/index'

vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ rules: [], configs: [] }),
})))
beforeEach(() => setActivePinia(createPinia()))
describe('配置草稿与完整导出', () => {
  it('切换工具保留各自配置与覆盖，不串用规则', () => {
    const store = useConfigStore()
    store.draft.code = 'export default [{rules:{eqeqeq:\'error\'}}]'
    store.setOverride('no-console', 'off')
    store.selectMode('stylelint')
    expect(store.draft.overrides).toEqual({})
    store.setOverride('color-hex-length', 'short')
    store.selectMode('eslint')
    expect(store.draft.overrides).toEqual({ 'no-console': 'off' })
    expect(store.exported).toContain('playgroundBase')
    expect(store.exported).toContain('no-console')
    expect(store.exported).not.toContain('color-hex-length')
  })
  it('恢复继承移除覆盖，而非显式关闭', () => {
    const store = useConfigStore()
    store.setOverride('no-console', 'off')
    store.inherit('no-console')
    expect(Object.hasOwn(store.draft.overrides, 'no-console')).toBe(false)
  })
  it('未知配置无默认导出时保留输入并阻止错误导出', () => {
    const store = useConfigStore()
    store.draft.code = 'const config = []'
    store.setOverride('no-console', 'error')
    expect(() => store.exported).toThrow('export default')
    expect(store.draft.code).toBe('const config = []')
  })
})
it('源码中的注释 export default 不干扰语法定位，避免覆盖现有变量', () => {
  const store = useConfigStore()
  store.draft.code = '// export default should stay a comment\nconst playgroundBase = 1\nexport default { rules: {} }'
  store.setOverride('no-console', 'off')
  expect(store.exported).toContain('// export default should stay a comment')
  expect(store.exported).toContain('const playgroundBase_ =')
})
it('markdownlint 无改动时比较相同导出格式，不把 CLI2 包装显示为用户改动', () => {
  const store = useConfigStore()
  store.selectMode('markdownlint')
  expect(store.changeCount).toBe(0)
  expect(store.baseExported).toBe(store.exported)
  store.setOverride('MD009', false)
  expect(store.changeCount).toBe(1)
  expect(store.baseExported).not.toBe(store.exported)
})
it('markdownlint 导出 CLI2 原生模块，扫描设置与规则覆盖分层且覆盖生效', async () => {
  const output = exportConfig('export default { MD009: true, MD013: false }', { MD009: false }, 'markdownlint')
  // 导出配置由 Node 运行，使用真实子进程，避免 jsdom 将 import.meta.url 转为页面 URL。
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
    import base from '@zzjtnb/markdownlint-config/config'
    const source = ${JSON.stringify(output)}.replace("'@zzjtnb/markdownlint-config/config'", JSON.stringify(import.meta.resolve('@zzjtnb/markdownlint-config/config')))
    const { default: config } = await import('data:text/javascript,' + encodeURIComponent(source))
    process.stdout.write(JSON.stringify({ base, config }))
  `])
  const { base, config } = JSON.parse(stdout)
  expect(config).toEqual({
    ...base,
    config: { MD009: false, MD013: false },
  })
  expect(config).not.toHaveProperty('fix')
})
it('异步配置只解析一次，导出与当前配置使用同一份结果', async () => {
  const source = `export default {
    then(resolve) {
      globalThis.__playgroundResolutions = (globalThis.__playgroundResolutions ?? 0) + 1
      resolve({ rules: { 'color-hex-length': 'short' } })
    },
  }`
  const output = exportConfig(source, { 'color-hex-length': 'long' }, 'stylelint')
  const host = globalThis as typeof globalThis & { __playgroundResolutions?: number }
  try {
    const { default: config } = await import(`data:text/javascript,${encodeURIComponent(output)}`)
    expect(host.__playgroundResolutions).toBe(1)
    expect(config.overrides.at(-1).rules).toEqual({ 'color-hex-length': 'long' })
  }
  finally { delete host.__playgroundResolutions }
})
