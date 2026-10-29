import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createMarkdownRenderer, resolveConfig } from 'vitepress'
import { describe, expect, it } from 'vitest'

const docs = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = resolve(docs, 'src')
const config = await resolveConfig(docs)
const renderer = await createMarkdownRenderer(sourceRoot, config.markdown, config.site.base)
const pages = readdirSync(sourceRoot, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
  .map(entry => resolve(entry.parentPath, entry.name))

type Token = ReturnType<typeof renderer.parse>[number]

function links(tokens: Token[]): string[] {
  return tokens.flatMap(token => [
    ...(token.type === 'link_open' || token.type === 'image'
      ? token.attrs?.filter(([name]) => name === 'href' || name === 'src').map(([, value]) => value) ?? []
      : []),
    ...links(token.children ?? []),
  ])
}

function metadataLinks(value: unknown): string[] {
  if (!value || typeof value !== 'object')
    return []
  return Object.entries(value).flatMap(([key, item]) => ['link', 'src', 'light', 'dark'].includes(key) && typeof item === 'string'
    ? [item]
    : metadataLinks(item))
}

const content = new Map(pages.map((page) => {
  const source = readFileSync(page, 'utf8')
  const env: Record<string, any> = {
    path: page,
    relativePath: page.slice(sourceRoot.length + 1),
  }
  const html = renderer.render(source, env)
  return [
    page,
    {
      links: [
        ...links(renderer.parse(source, {})),
        ...metadataLinks(env.frontmatter),
      ],
      anchors: new Set([
        ...html.matchAll(/\bid="([^"]+)"/g),
      ].map(match => match[1])),
    },
  ]
}))

/** 核对指向仓库 Markdown 文件的链接与标题锚点。 */
function checkRepositoryLink(href: string, page: string) {
  const repositoryLink = /^https:\/\/github\.com\/zzjtnb\/zzjtnb-lint-config\/blob\/main\/([^#?]+\.md)(?:#([^?]+))?$/.exec(href)
  if (repositoryLink) {
    const target = resolve(docs, '..', decodeURIComponent(repositoryLink[1]!))
    expect(existsSync(target), `${page} -> ${href}`).toBe(true)
    if (repositoryLink[2]) {
      // 仓库 Markdown 的链接也核对实际标题，避免改名后留下无法被站内检查发现的旧锚点。
      const html = renderer.render(readFileSync(target, 'utf8'))
      const anchors = [
        ...html.matchAll(/\bid="([^"]+)"/g),
      ].map(match => match[1])
      expect(anchors, `${page} -> ${href}`).toContain(decodeURIComponent(repositoryLink[2]))
    }
    return true
  }
  return false
}

function checkLink(href: string, page: string) {
  if (checkRepositoryLink(href, page))
    return
  if (/^(?:[a-z][\w+.-]*:|\/\/)/i.test(href))
    return
  const [rawPath, rawAnchor] = href.split('#', 2)
  const pathname = decodeURIComponent(rawPath!.split('?', 1)[0]!)
  let target: string | undefined = page
  if (pathname) {
    const local = pathname.replace(/\.html$/, '.md')
    const base = local.startsWith('/')
      ? resolve(sourceRoot, `.${local}`)
      : resolve(dirname(page), local)
    const candidates = [
      base,
      `${base}.md`,
      resolve(base, 'index.md'),
    ]

    // 路由使用重写后的地址，锚点仍从实际 Markdown 源文件校验。
    if (local.startsWith('/')) {
      candidates.push(resolve(sourceRoot, 'public', `.${local}`))
      const source = config.rewrites.inv[`${local.slice(1).replace(/\.md$/, '')}.md`]
      if (source)
        candidates.unshift(resolve(sourceRoot, source))
    }
    target = candidates.find(candidate => existsSync(candidate) && statSync(candidate).isFile())
    expect(target, `${page} -> ${href}`).toBeDefined()
    if (extname(local) && extname(local) !== '.md')
      expect(candidates.some(existsSync), `${page} -> ${href}`).toBe(true)
  }
  if (target && rawAnchor && content.has(target))
    expect(content.get(target)!.anchors.has(decodeURIComponent(rawAnchor)), `${page} -> ${href}`).toBe(true)
}

describe('中文路由、正文与导航', () => {
  it.each(pages)('%s 的正文、首页元数据与锚点均有效', (page) => {
    for (const href of content.get(page)!.links)
      checkLink(href, page)
  })

  it('实际配置保留 Playground 顶栏入口并使用依赖管理短路由', () => {
    expect(config.site.themeConfig.nav).toContainEqual({ text: 'Playground', link: 'http://localhost:3001/' })
    const targets = metadataLinks(config.site.themeConfig)
    expect(targets).toContain('/dependencies')
    expect(targets.some(target => target.includes('dependency-management'))).toBe(false)
  })

  it('导航与侧边栏都指向已有页面', () => {
    const page = resolve(sourceRoot, 'index.md')
    for (const href of metadataLinks(config.site.themeConfig))
      checkLink(href, page)
  })
})
