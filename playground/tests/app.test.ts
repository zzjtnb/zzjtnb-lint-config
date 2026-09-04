import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @vitest-environment happy-dom
import { createApp, nextTick } from 'vue'

import App from '../src/App.vue'
import { apiMock } from './helpers'

let app: ReturnType<typeof createApp> | undefined
let container: HTMLDivElement | undefined

beforeEach(() => {
  vi.stubGlobal('fetch', apiMock())
})

function renderApp() {
  container = document.createElement('div')
  document.body.append(container)
  app = createApp(App)
  app.mount(container)
  return container
}

async function settle() {
  for (let index = 0; index < 8; index++) {
    await Promise.resolve()
    await nextTick()
  }
}

async function chooseTask(root: HTMLElement, label: string) {
  const button = [
    ...root.querySelectorAll<HTMLButtonElement>('.view-switcher button'),
  ].find(button => button.textContent?.includes(label))!
  button.click()
  await settle()
}

afterEach(() => {
  app?.unmount()
  container?.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('工作台实际组件交互', () => {
  it('运行前不伪造零错误，配置草稿不会被当作程序执行', async () => {
    const root = renderApp()
    await settle()
    expect(root.querySelector('.result-pane')?.textContent).toContain('尚未运行')
    expect(root.querySelector('.result-pane')?.textContent).not.toContain('0 个错误')
    await chooseTask(root, '配置接入')
    const editor = root.querySelector('textarea')!
    editor.value = '// export default\n这不是可执行配置'
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(root.querySelector('.config-note')?.textContent).toContain('不会在运行器中执行')
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/lint'))).toBe(false)
  })

  it('复制失败通过状态区域反馈，按钮恢复为可重试状态', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const root = renderApp()
    const share = root.querySelector<HTMLButtonElement>('[title="分享当前配置"]')!
    share.click()
    await settle()
    expect(root.querySelector('[role="status"]')?.textContent).toContain('分享失败')
    expect(share.textContent).not.toContain('已复制')
    expect(share.getAttribute('aria-disabled')).toBe('false')
  })

  it('面板分隔线支持键盘并同步可访问范围状态', async () => {
    const root = renderApp()
    const separator = root.querySelector<HTMLElement>('[role="separator"]')!
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expect(separator.getAttribute('aria-valuenow')).toBe('65')
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', shiftKey: true, bubbles: true }))
    await nextTick()
    expect(separator.getAttribute('aria-valuenow')).toBe('60')
    separator.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await nextTick()
    expect(separator.getAttribute('aria-valuenow')).toBe('30')
    expect(root.querySelector('.experiment-split')?.getAttribute('style')).toContain('30%')
  })

  it.each(['切换任务', '卸载页面'])('实验区%s时释放其拖拽监听器', async (action) => {
    const root = renderApp()
    const handle = root.querySelector<HTMLElement>('[role="separator"]')!
    vi.spyOn(handle.parentElement!, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 1000 } as DOMRect)
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    handle.dispatchEvent(new PointerEvent('pointerdown', {
      button: 0,
      pointerId: 1,
      bubbles: true,
      cancelable: true,
    }))
    const move = add.mock.calls.find(([name]) => name === 'pointermove')?.[1]
    expect(move).toBeTypeOf('function')
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 400, pointerId: 1 }))
    await nextTick()
    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    if (action === '切换任务') {
      await chooseTask(root, '配置接入')
    }
    else {
      app!.unmount()
      app = undefined
    }
    expect(remove).toHaveBeenCalledWith('pointermove', move)
    for (const name of ['pointerup', 'pointercancel', 'blur']) {
      const listener = add.mock.calls.find(([event]) => event === name)?.[1]
      expect(remove).toHaveBeenCalledWith(name, listener)
    }
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 600, pointerId: 1 }))
    expect(handle.getAttribute('aria-valuenow')).toBe('40')
  })

  it('三个包均可通过原生按钮切换，并保持各自文件类型', async () => {
    const root = renderApp()
    const buttons = root.querySelectorAll<HTMLButtonElement>('[aria-label="选择配置包"] button')
    expect(buttons).toHaveLength(3)
    buttons[2]!.click()
    await settle()
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false')
    expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true')
    expect(root.querySelector('select')?.value).toBe('sample.md')
  })

  it('真实请求返回的诊断可定位到代码行，修复结果回填编辑器', async () => {
    const root = renderApp()
    await settle()
    root.querySelector<HTMLButtonElement>('.primary')!.click()
    await settle()
    const issue = root.querySelector<HTMLButtonElement>('.diagnostic')!
    expect(issue.textContent).toContain('界面测试诊断')
    issue.click()
    expect(document.activeElement).toBe(root.querySelector('textarea'))
    root.querySelector<HTMLButtonElement>('.run-actions .secondary')!.click()
    await settle()
    expect(root.querySelector('textarea')?.value).toBe('const answer = 42\n')
    expect(root.querySelector('.result-pane')?.textContent).toContain('检查通过')
  })

  it('规则可以搜索、筛选，空结果提供恢复入口', async () => {
    const root = renderApp()
    await chooseTask(root, '规则参考')
    expect(root.querySelectorAll('.rule-row')).toHaveLength(2)
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!
    search.value = '不存在的规则'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(root.querySelector('.rule-empty')?.textContent).toContain('没有匹配的规则')
    root.querySelector<HTMLButtonElement>('.rule-empty button')!.click()
    await settle()
    expect(root.querySelectorAll('.rule-row')).toHaveLength(2)
  })

  it('规则级别说明违规处理方式，不冒充代码结果或可点击的开关', async () => {
    const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const root = renderApp()
    await chooseTask(root, '规则参考')
    expect(root.querySelector('.rule-guide')?.textContent).toContain('不是代码检查结果')
    const rows = root.querySelectorAll<HTMLButtonElement>('.rule-row')
    expect(rows[0]!.querySelector('.rule-level')?.textContent).toBe('违规时报错')
    expect(rows[1]!.querySelector('.rule-level')?.textContent).toBe('未启用')
    expect(root.querySelector('.rule-properties')?.textContent).toContain('不代表当前代码已有错误')
    root.querySelector<HTMLButtonElement>('.rule-value-heading button')!.click()
    await settle()
    expect(copy).toHaveBeenCalledWith('[\n  2\n]')
    rows[1]!.click()
    await settle()
    expect(root.querySelector('.rule-properties')?.textContent).toContain('不参与当前文件的检查')
    expect(root.querySelector('.rule-level[role="switch"]')).toBeNull()
  })

  it('规则参考可直接切换文件类型，详情不会保留被搜索排除的规则', async () => {
    const root = renderApp()
    await chooseTask(root, '规则参考')
    const rows = root.querySelectorAll<HTMLButtonElement>('.rule-row')
    rows[1]!.click()
    await settle()
    expect(root.querySelector('.rule-detail-body h2')?.textContent).toBe('disabled-rule')
    const search = root.querySelector<HTMLInputElement>('input[type="search"]')!
    search.value = 'example-rule'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(root.querySelector('.rule-detail-body h2')?.textContent).toBe('example-rule')
    search.value = '没有匹配'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(root.querySelector('.rule-detail-body')).toBeNull()
    const file = root.querySelector<HTMLSelectElement>('.target-select select')!
    file.value = 'sample.vue'
    file.dispatchEvent(new Event('change', { bubbles: true }))
    await settle()
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes('filename=sample.vue'))).toBe(true)
  })

  it('诊断筛选没有匹配时不报告检查通过，旧诊断不能定位到新代码', async () => {
    const root = renderApp()
    await settle()
    root.querySelector<HTMLButtonElement>('.primary')!.click()
    await settle()
    const level = root.querySelector<HTMLSelectElement>('.diagnostic-filter select')!
    level.value = 'warning'
    level.dispatchEvent(new Event('change', { bubbles: true }))
    await settle()
    expect(root.querySelector('.result-filter-empty')?.textContent).toContain('没有此级别的问题')
    expect(root.querySelector('.result-pane')?.textContent).not.toContain('检查通过')
    root.querySelector<HTMLButtonElement>('.result-filter-empty button')!.click()
    await settle()
    const editor = root.querySelector('textarea')!
    editor.value = '已经修改的草稿'
    editor.dispatchEvent(new Event('input', { bubbles: true }))
    await settle()
    expect(root.querySelector<HTMLButtonElement>('.diagnostic')?.disabled).toBe(true)
    expect(root.querySelector('.stale-notice')?.textContent).toContain('代码已修改')
  })

  it('检查失败的重试按钮重新检查代码而不是只读取规则', async () => {
    const base = apiMock()
    let failed = false
    vi.stubGlobal('fetch', vi.fn((input: string, init?: RequestInit) => {
      if (input.endsWith('/lint') && !failed) {
        failed = true
        return Promise.reject(new Error('offline'))
      }
      return base(input, init)
    }))
    const root = renderApp()
    await settle()
    root.querySelector<HTMLButtonElement>('.primary')!.click()
    await settle()
    const retry = root.querySelector<HTMLButtonElement>('.result-pane .inline-notice button')!
    expect(retry.textContent).toBe('重新检查')
    retry.click()
    await settle()
    expect(root.querySelector('.diagnostic')).not.toBeNull()
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/lint'))).toHaveLength(2)
  })

  it.each(['ctrlKey', 'metaKey'])('代码编辑器支持 %s + Enter 检查，但不执行配置草稿', async (modifier) => {
    const root = renderApp()
    await settle()
    const shortcut = () => new KeyboardEvent('keydown', {
      key: 'Enter',
      [modifier]: true,
      bubbles: true,
      cancelable: true,
    })
    root.querySelector('textarea')!.dispatchEvent(shortcut())
    await settle()
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/lint'))).toHaveLength(1)
    await chooseTask(root, '配置接入')
    root.querySelector('textarea')!.dispatchEvent(shortcut())
    await settle()
    expect(vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith('/lint'))).toHaveLength(1)
  })

  it('代码编辑器可通过 Escape 后 Tab 退出，不形成键盘陷阱', async () => {
    const root = renderApp()
    const editor = root.querySelector('textarea')!
    editor.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    editor.dispatchEvent(tab)
    await settle()
    expect(tab.defaultPrevented).toBe(false)
  })
})
