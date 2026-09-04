import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment happy-dom
import { createApp, h, nextTick } from 'vue'

import { usePlayground } from '../src/views/usePlayground'
import { apiMock } from './helpers'

beforeEach(() => {
  vi.stubGlobal('fetch', apiMock())
})

let app: ReturnType<typeof createApp> | undefined
let container: HTMLDivElement | undefined
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function mountPlayground() {
  let state!: ReturnType<typeof usePlayground>
  container = document.createElement('div')
  document.body.append(container)
  app = createApp({
    setup() {
      state = usePlayground()
      return () => h('div')
    },
  })
  app.mount(container)
  return state
}

function setClipboard(writeText?: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText
      ? { writeText }
      : undefined,
  })
}

afterEach(() => {
  app?.unmount()
  app = undefined
  container?.remove()
  container = undefined
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
  if (clipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', clipboardDescriptor)
  }
  else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

describe('工作台状态与资源生命周期', () => {
  it.each(['null', '{"mode":"toString"}', '{"dark":"false"}'])('拒绝无效分享状态，保留可用页面：%s', (input) => {
    window.history.replaceState(null, '', `/#${encodeURIComponent(input)}`)
    const state = mountPlayground()
    expect(state.mode.value).toBe('eslint')
    expect(state.dark.value).toBe(false)
    expect(state.stateError.value).not.toBe('')
  })

  it('保留用户有意清空的草稿，不替换为默认配置', () => {
    window.history.replaceState(null, '', `/#${encodeURIComponent(JSON.stringify({
      rawConfigs: { eslint: '' },
    }))}`)
    const state = mountPlayground()
    expect(state.rawConfigs.eslint).toBe('')
    expect(state.rawConfigs.eslint).not.toContain('export default')
  })

  it('浏览器没有剪贴板能力时不报告复制成功', async () => {
    setClipboard()
    const state = mountPlayground()
    await state.share()
    expect(state.copied.value).toBe(false)
    expect(state.shareError.value).not.toBe('')
  })

  it('剪贴板拒绝写入时显示可恢复错误，不留下未处理的拒绝', async () => {
    setClipboard(vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')))
    const state = mountPlayground()
    await expect(state.share()).resolves.toBeUndefined()
    expect(state.copied.value).toBe(false)
    expect(state.shareError.value).not.toBe('')
  })

  it('分享尚未完成时不重复调用剪贴板', async () => {
    let finish!: () => void
    const writeText = vi.fn(() => new Promise<void>((resolve) => {
      finish = resolve
    }))
    setClipboard(writeText)
    const state = mountPlayground()
    const first = state.share()
    const second = state.share()
    expect(writeText).toHaveBeenCalledTimes(1)
    finish()
    await Promise.all([first, second])
    expect(state.copied.value).toBe(true)
  })

  it('分享后继续编辑会清除旧快照，刷新时恢复最新本地草稿', async () => {
    setClipboard(vi.fn().mockResolvedValue(undefined))
    const state = mountPlayground()
    state.source.value = '分享时的草稿'
    await nextTick()
    await state.share()
    expect(window.location.hash).not.toBe('')

    state.source.value = '分享后的新草稿'
    await nextTick()
    expect(window.location.hash).toBe('')
    app!.unmount()
    container!.remove()
    const restored = mountPlayground()
    expect(restored.source.value).toBe('分享后的新草稿')
  })

  it('打开分享链接后的编辑不能在刷新时被链接中的旧草稿覆盖', async () => {
    window.history.replaceState(null, '', `/#${encodeURIComponent(JSON.stringify({
      drafts: { 'eslint/sample.ts': '链接草稿' },
    }))}`)
    const state = mountPlayground()
    expect(state.source.value).toBe('链接草稿')
    await nextTick()
    state.source.value = '接收方的新草稿'
    await nextTick()
    app!.unmount()
    container!.remove()
    const restored = mountPlayground()
    expect(restored.source.value).toBe('接收方的新草稿')
  })

  it('旧复制反馈的计时器不会提前清除新反馈', async () => {
    vi.useFakeTimers()
    setClipboard(vi.fn().mockResolvedValue(undefined))
    const state = mountPlayground()
    await state.share()
    vi.advanceTimersByTime(1500)
    await state.share()
    vi.advanceTimersByTime(200)
    expect(state.copied.value).toBe(true)
  })

  it('重置之后不再应用旧分享操作的迟到反馈', async () => {
    let finish!: () => void
    setClipboard(() => new Promise<void>((resolve) => {
      finish = resolve
    }))
    const state = mountPlayground()
    const pending = state.share()
    state.reset()
    finish()
    await pending
    expect(state.copied.value).toBe(false)
  })

  it('存储配额不足不会中断当前编辑流程', async () => {
    const save = vi.spyOn(window.localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const state = mountPlayground()
    state.query.value = 'edited'
    await expect(nextTick()).resolves.toBeUndefined()
    expect(state.query.value).toBe('edited')
    expect(save).toHaveBeenCalled()
    expect(state.stateError.value).not.toBe('')
  })

  it('切换工具和文件时分别保留代码与配置草稿', () => {
    const state = mountPlayground()
    state.source.value = 'first draft'
    state.rawConfigs.eslint = 'config draft'
    state.selectFile('sample.js')
    state.source.value = 'second draft'
    state.selectMode('markdownlint')
    expect(state.filename.value).toBe('sample.md')
    state.selectMode('eslint')
    expect(state.source.value).toBe('second draft')
    state.selectFile('sample.ts')
    expect(state.source.value).toBe('first draft')
    expect(state.rawConfigs.eslint).toBe('config draft')
  })

  it('代码修改后不会被迟到的检查结果覆盖', async () => {
    let finish!: (value: Response) => void
    const base = apiMock()
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => input.endsWith('/lint')
      ? new Promise<Response>((resolve) => { finish = resolve })
      : base(input, init)))
    const state = mountPlayground()
    const pending = state.run(true)
    state.source.value = 'new draft'
    await nextTick()
    finish(Response.json({
      mode: 'eslint',
      filename: 'sample.ts',
      output: 'old result',
      diagnostics: [],
      durationMs: 1,
    }))
    await pending
    expect(state.source.value).toBe('new draft')
    expect(state.result.value).toBeUndefined()
    expect(state.running.value).toBe(false)
  })

  it('读取失败时不以空规则列表冒充成功，并可重试', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const state = mountPlayground()
    await state.loadMetadata(true)
    expect(state.meta.value).toBeUndefined()
    expect(state.metaError.value).not.toBe('')
    vi.stubGlobal('fetch', apiMock())
    await state.loadMetadata(true)
    expect(state.meta.value?.rules).toHaveLength(2)
    expect(state.metaError.value).toBe('')
  })
})
