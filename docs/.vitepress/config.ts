import type { ConfigEnv } from 'vitepress'

import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vitepress'
import { groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

import { createNavigation, navigationPlugin } from './navigation.ts'

export default ({ mode }: ConfigEnv) => {
  // 配置解析早于 Vite 自动加载环境文件，须从文档项目根按模式显式读取。
  const env = loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), 'PLAYGROUND_')
  // 命令行和 CI 环境变量优先；地址会进入公开导航，不得包含令牌或其他敏感值。
  const playgroundUrl = process.env.PLAYGROUND_URL ?? env.PLAYGROUND_URL
  if (playgroundUrl && !['http:', 'https:'].includes(new URL(playgroundUrl).protocol))
    throw new Error('PLAYGROUND_URL 必须是完整的 HTTP 或 HTTPS 地址')
  const links = playgroundUrl
    ? [
        { text: 'Playground', link: playgroundUrl },
      ]
    : []
  const navigation = createNavigation(undefined, links)
  return defineConfig({
    title: 'zzjtnb-lint-config',
    description: '面向现代前端项目的 ESLint、Stylelint 与 Markdownlint 共享配置',
    srcDir: 'src',
    cleanUrls: true,
    // 时间来自对应文件的 Git 提交历史，不使用构建时间替代。
    lastUpdated: true,
    lang: 'zh-CN',
    markdown: {
      config(md) {
        md.use(groupIconMdPlugin)
      },
    },
    head: [
      [
        'link',
        { rel: 'icon', href: '/logo.svg' },
      ],
    ],
    vite: {
      plugins: [
        groupIconVitePlugin(),
        navigationPlugin(links),
      ],
      server: {
        host: true,
        // 同一站点的开发与预览不同时运行，均固定使用 3000。
        port: 3000,
        strictPort: true,
      },
      preview: {
        host: true,
        port: 3000,
        strictPort: true,
      },
    },
    themeConfig: {
      logo: '/logo.svg',
      siteTitle: 'zzjtnb-lint-config',
      outline: {
        label: '本页目录',
        level: [2, 3],
      },
      lastUpdated: {
        text: '最后更新于',
        formatOptions: { dateStyle: 'medium' },
      },
      docFooter: { prev: '上一页', next: '下一页' },
      sidebarMenuLabel: '目录',
      returnToTopLabel: '返回顶部',
      darkModeSwitchLabel: '外观',
      lightModeSwitchTitle: '切换为浅色模式',
      darkModeSwitchTitle: '切换为深色模式',
      notFound: {
        title: '页面不存在',
        quote: '请通过导航或搜索查找需要的文档。',
        linkLabel: '返回首页',
        linkText: '返回首页',
      },
      ...navigation,
      search: {
        provider: 'local',
        options: {
          locales: {
            root: {
              translations: {
                button: { buttonText: '搜索', buttonAriaLabel: '搜索文档' },
                modal: {
                  displayDetails: '显示详细结果',
                  resetButtonTitle: '清除查询条件',
                  backButtonTitle: '关闭搜索',
                  noResultsText: '未找到相关结果',
                  footer: {
                    selectText: '选择',
                    selectKeyAriaLabel: '回车键',
                    navigateText: '切换',
                    navigateUpKeyAriaLabel: '上方向键',
                    navigateDownKeyAriaLabel: '下方向键',
                    closeText: '关闭',
                    closeKeyAriaLabel: 'Escape 键',
                  },
                },
              },
            },
          },
        },
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/zzjtnb/zzjtnb-lint-config' },
      ],
      footer: {
        message: 'MIT License',
        copyright: 'Copyright © 2022 争逐',
      },
    },
  })
}
