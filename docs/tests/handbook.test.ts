/** 核对工程手册的现行文档入口。 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

it('工程手册引用现行中文页面与维护说明，不保留已迁移的短路由', () => {
  const source = readFileSync(new URL('../../apps/handbook/工程参考.md', import.meta.url), 'utf8')
  for (const target of [
    'quick-start',
    'eslint',
    'stylelint',
    'markdownlint',
    'engineering/versions',
  ]) {
    expect(source).toContain(`../../docs/src/${target}${['eslint', 'stylelint', 'markdownlint'].includes(target)
      ? '/index'
      : ''}.md`)
  }
  expect(source).toContain('./Playground使用说明.md')
  expect(source).not.toContain('双语 VitePress')
})

it('仓库说明中的本地文档链接都有实际目标', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const files = [
    'README.md',
    'playground/README.md',
    'playground/scripts/README.md',
    'scripts/release/README.md',
    ...readdirSync(resolve(root, 'apps/handbook')).filter(name => name.endsWith('.md')).map(name => `apps/handbook/${name}`),
    ...['eslint', 'stylelint', 'markdownlint'].flatMap(tool => [
      `packages/${tool}/README.md`,
      `packages/${tool}/README.zh-CN.md`,
    ]),
  ]
  for (const file of files) {
    let fence = ''
    const source = readFileSync(resolve(root, file), 'utf8').split('\n').filter((line) => {
      const marker = /^`{3,}/.exec(line)?.[0]
      if (!fence && marker)
        fence = marker
      else if (marker === fence)
        fence = ''
      return !fence && !marker
    }).join('\n')
    for (const match of source.matchAll(/\]\(([^\s)]+)(?:\s+"[^"]*")?\)|^\[[^\]]+\]:\s*(\S+)/gm)) {
      const href = match[1] ?? match[2]!
      if (/^(?:[a-z][\w+.-]*:|\/|#)/i.test(href))
        continue
      const path = decodeURIComponent(href.split('#')[0]!)
      if (!path)
        continue
      const target = resolve(root, dirname(file), path)
      expect([
        target,
        `${target}.md`,
        resolve(target, 'index.md'),
      ].some(existsSync), `${file} -> ${href}`).toBe(true)
    }
  }
})

it('双语包说明的安装和命令示例一致，包含相同的配置示例数量', () => {
  for (const tool of ['eslint', 'stylelint', 'markdownlint']) {
    const source = ['README.md', 'README.zh-CN.md'].map(name => readFileSync(new URL(`../../packages/${tool}/${name}`, import.meta.url), 'utf8'))
    const blocks = source.map(text => [
      ...text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g),
    ])
    expect(blocks[0]!.map(match => match[1]), tool).toEqual(blocks[1]!.map(match => match[1]))
    const commands = blocks.map(items => items.filter(match => ['bash', 'json'].includes(match[1]!)).map(match => match[2]!.split('\n').filter(line => !/^\s*(?:#|\/\/)/.test(line)).join('\n')))
    expect(commands[0], tool).toEqual(commands[1])
  }
})

it('仓库操作说明只调用所属工作区实际声明的脚本', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const manifests = new Map([
    'docs',
    'playground',
    'scripts',
    'internal/testing',
    'packages/eslint',
    'packages/stylelint',
    'packages/markdownlint',
  ].map((directory) => {
    const manifest = JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8'))
    return [manifest.name as string, manifest.scripts as Record<string, string>]
  }))
  const files = [
    'playground/README.md',
    'playground/scripts/README.md',
    ...readdirSync(resolve(root, 'apps/handbook')).filter(name => name.endsWith('.md')).map(name => `apps/handbook/${name}`),
  ]
  for (const file of files) {
    const source = readFileSync(resolve(root, file), 'utf8')
    for (const match of source.matchAll(/pnpm[^\n]*?--filter\s+(@zzjtnb\/[\w-]+)\s+run\s+([\w:-]+)/g)) {
      if (!manifests.has(match[1]!))
        continue
      expect(manifests.get(match[1]!), `${file}: ${match[0]}`).toHaveProperty(match[2]!)
    }
  }
})
