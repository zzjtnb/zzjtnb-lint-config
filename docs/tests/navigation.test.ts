import { readdirSync, readFileSync } from 'node:fs'

import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createNavigation, navigationPlugin } from '../.vitepress/navigation.ts'

vi.mock('node:fs', () => ({
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
}))

function source(group: string, order: number, title = '示例') {
  return `---\nnavigation:\n  text: ${title}\n  group: ${group}\n  order: ${order}\n---\n\n# 正文\n`
}

function files(entries: Record<string, string>, root = '/docs/src') {
  vi.mocked(readdirSync).mockReturnValue(Object.keys(entries).map(name => ({
    name: name.split('/').at(-1)!,
    parentPath: `${root}/${name.includes('/')
      ? name.slice(0, name.lastIndexOf('/'))
      : ''}`,
    isFile: () => true,
  })) as never)
  vi.mocked(readFileSync).mockImplementation(file => entries[String(file).slice(root.length + 1)] as never)
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('页面元数据导航', () => {
  it('按组和顺序生成链接，支持嵌套 index', () => {
    files({
      'second.md': source('configuration', 20, '第二页'),
      'nested/index.md': source('configuration', 10, '第一页'),
      'index.md': '---\nlayout: home\n---\n',
      'hidden.md': '---\nnavigation: false\n---\n',
    })
    const result = createNavigation('/docs/src')
    expect(result.sidebar).toEqual([
      {
        text: '共享配置',
        items: [
          { text: '第一页', link: '/nested/' },
          { text: '第二页', link: '/second' },
        ],
      },
    ])
    expect(result.nav).toEqual([
      { text: '共享配置', link: '/nested/' },
    ])
  })

  it('独立应用入口由配置提供', () => {
    files({
      'quick-start.md': source('start', 10, '快速开始'),
    })
    const link = { text: 'Playground', link: 'http://localhost:3001/' }
    const result = createNavigation('/docs/src', [link])
    expect(result.nav).toContainEqual(link)
    expect(result.sidebar[0]!.items).toContainEqual({ text: '快速开始', link: '/quick-start' })
  })

  it.each([
    '# 缺少元数据',
    source('unknown', 10),
    source('start', -1),
    source('start', 1.5),
    source('start', 10, '\'\''),
  ])('拒绝无效元数据，而不是静默遗漏页面：%s', (content) => {
    files({ 'page.md': content })
    expect(() => createNavigation('/docs/src')).toThrow('page.md:')
  })

  it('拒绝同组顺序冲突', () => {
    files({
      'a.md': source('start', 10),
      'b.md': source('start', 10),
    })
    expect(() => createNavigation('/docs/src')).toThrow('不得重复')
  })

  it('文件新增和移除直接反映在生成结果，不缓存旧清单', () => {
    files({
      'a.md': source('start', 10),
    })
    expect(createNavigation('/docs/src').sidebar[0]!.items).toHaveLength(1)
    files({
      'a.md': source('start', 10),
      'b.md': source('start', 20),
    })
    expect(createNavigation('/docs/src').sidebar[0]!.items).toHaveLength(2)
    files({})
    expect(createNavigation('/docs/src').sidebar).toEqual([])
  })

  it('仅导航变化触发官方配置重载，非法元数据记录错误，关闭时释放监听和待执行任务', async () => {
    vi.useFakeTimers()
    const root = fileURLToPath(new URL('../src', import.meta.url))
    files({
      'a.md': source('start', 10),
    }, root)
    let update!: (event: string, file: string) => void
    let close!: () => void
    const emit = vi.fn()
    const error = vi.fn()
    const off = vi.fn()
    const server = {
      watcher: {
        emit,
        on: vi.fn((_event, callback) => { update = callback }),
        off,
      },
      config: {
        logger: { error },
      },
      httpServer: {
        once: vi.fn((_event, callback) => { close = callback }),
      },
    }
    const plugin = navigationPlugin()
    const hook = plugin.configureServer!
    const configure = typeof hook === 'function'
      ? hook
      : hook.handler
    await configure.call({} as never, server as never)
    update('change', `${root}/a.md`)
    await vi.runAllTimersAsync()
    expect(emit).not.toHaveBeenCalled()
    files({ 'a.md': `${source('start', 10)}正文变化` }, root)
    update('change', `${root}/a.md`)
    await vi.runAllTimersAsync()
    expect(emit).not.toHaveBeenCalled()
    files({
      'a.md': source('start', 10, '新标题'),
    }, root)
    update('change', `${root}/a.md`)
    await vi.runAllTimersAsync()
    expect(emit).toHaveBeenCalledTimes(1)
    expect(emit).toHaveBeenCalledWith('change', fileURLToPath(new URL('../.vitepress/config.ts', import.meta.url)))
    files({ 'a.md': '# 缺少元数据' }, root)
    update('change', `${root}/a.md`)
    await vi.runAllTimersAsync()
    expect(error).toHaveBeenCalledWith(expect.stringContaining('a.md:'))
    expect(emit).toHaveBeenCalledTimes(1)
    files({}, root)
    update('unlink', `${root}/a.md`)
    await vi.runAllTimersAsync()
    expect(emit).toHaveBeenCalledTimes(2)
    files({
      'b.md': source('start', 10),
    }, root)
    update('add', `${root}/b.md`)
    close()
    await vi.runAllTimersAsync()
    expect(off).toHaveBeenCalledWith('all', update)
    expect(emit).toHaveBeenCalledTimes(2)
  })
})
