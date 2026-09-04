import type { Plugin } from 'vite'
import type { DefaultTheme } from 'vitepress'

import { readdirSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import matter from 'gray-matter'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const groups = {
  start: '入门',
  configuration: '共享配置',
  engineering: '工程与维护',
} as const

type Group = keyof typeof groups

interface Page {
  title: string
  group: Group
  order: number
  link: string
}

/**
 * 从页面元数据生成默认主题导航，首页和显式排除的页面不参与。
 * @param root Markdown 源目录。
 * @param links 独立应用等非文档页面的顶栏入口。
 * @returns 中文导航与侧边栏；缺失或冲突的元数据会抛错。
 */
export function createNavigation(root = sourceRoot, links: DefaultTheme.NavItem[] = []) {
  const pages: Page[] = []
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md'))
      continue
    const file = resolve(entry.parentPath, entry.name)
    const path = relative(root, file).replaceAll('\\', '/')
    const { data } = matter(readFileSync(file, 'utf8'))
    if (data.layout === 'home' || data.navigation === false)
      continue
    const navigation = data.navigation
    if (typeof navigation?.text !== 'string' || !navigation.text.trim()
      || !navigation || typeof navigation !== 'object'
      || !Object.hasOwn(groups, navigation.group)
      || !Number.isSafeInteger(navigation.order) || navigation.order < 0)
      throw new Error(`${path}: 请声明 navigation 的有效 text、group 和非负整数 order`)
    if (pages.some(page => page.group === navigation.group && page.order === navigation.order))
      throw new Error(`${path}: 同组的 navigation.order 不得重复`)
    pages.push({
      title: navigation.text,
      group: navigation.group,
      order: navigation.order,
      link: `/${path.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')}`,
    })
  }

  const sidebar: DefaultTheme.SidebarItem[] = Object.entries(groups).flatMap(([group, label]) => {
    const items = pages.filter(page => page.group === group)
      .sort((a, b) => a.order - b.order)
      .map(page => ({ text: page.title, link: page.link }))
    return items.length
      ? [
          { text: label, items },
        ]
      : []
  })
  const nav: DefaultTheme.NavItem[] = [
    ...sidebar.map(group => ({ text: group.text!, link: group.items![0]!.link! })),
    ...links,
  ]
  return { nav, sidebar }
}

/**
 * 页面标题、分组、顺序或文件增删影响导航时重新加载配置，正文编辑仍交给 VitePress HMR。
 * @returns 生命周期绑定开发服务器的 Vite 插件。
 */
export function navigationPlugin(links: DefaultTheme.NavItem[] = []): Plugin {
  return {
    name: 'docs-navigation',
    configureServer(server) {
      let signature = JSON.stringify(createNavigation(sourceRoot, links))
      let timer: ReturnType<typeof setTimeout> | undefined
      const update = (_event: string, file: string) => {
        if (!file.startsWith(sourceRoot) || !file.endsWith('.md'))
          return
        clearTimeout(timer)
        timer = setTimeout(() => {
          try {
            const next = JSON.stringify(createNavigation(sourceRoot, links))
            if (next === signature)
              return
            signature = next
            // Vite 的 restart 不会重新解析内联的 VitePress 配置；交回官方配置变更流程。
            server.watcher.emit('change', fileURLToPath(new URL('./config.ts', import.meta.url)))
          }
          catch (error) {
            server.config.logger.error(String(error))
          }
        }, 100)
      }
      server.watcher.on('all', update)
      server.httpServer?.once('close', () => {
        clearTimeout(timer)
        server.watcher.off('all', update)
      })
    },
  }
}
