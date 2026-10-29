import type { ConfigEnv } from 'vitepress'

import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vitepress'
import { builtinIcons, groupIconMdPlugin, groupIconVitePlugin } from 'vitepress-plugin-group-icons'

import { createNavigation, navigationPlugin, rewrites } from './navigation.ts'

export default ({ mode }: ConfigEnv) => {
  // 配置解析早于 Vite 自动加载环境文件，须从文档项目根按模式显式读取。
  const env = loadEnv(mode, fileURLToPath(new URL('../', import.meta.url)), ['PLAYGROUND_', 'VITE_'])
  // 命令行和 CI 环境变量优先；地址会进入公开导航，不得包含令牌或其他敏感值。
  const playgroundUrl = process.env.PLAYGROUND_URL ?? env.PLAYGROUND_URL
  if (playgroundUrl && !['http:', 'https:'].includes(new URL(playgroundUrl).protocol))
    throw new Error('PLAYGROUND_URL 必须是完整的 HTTP 或 HTTPS 地址')
  const links = playgroundUrl
    ? [
        {
          // 当前导航或提示的可见文字。
          text: 'Playground',
          // 该导航项实际打开的地址；外部地址保留完整协议。
          link: playgroundUrl,
        },
      ]
    : []
  const navigation = createNavigation(undefined, links)
  return defineConfig({
    // 站点或当前视图的标题，展示于主题提供的标题位置。
    title: 'zzjtnb-lint-config',
    // 站点说明，用于页面元信息与搜索结果摘要。
    description: '面向现代前端项目的 ESLint、Stylelint 与 Markdownlint 共享配置',
    // 从此目录读取文档源文件，路径相对文档项目根。
    srcDir: 'src',
    // 使用官方 rewrites 将各包目录首页映射回已有短地址，其余页面保留包名前缀。
    rewrites,
    // 生成无 .html 后缀的页面链接；静态托管须支持对应的文件解析。
    cleanUrls: true,
    // 时间来自对应文件的 Git 提交历史，不使用构建时间替代。
    lastUpdated: true,
    // 声明文档语言，供页面语言属性、可访问性和搜索处理使用。
    lang: 'zh-CN',
    // 扩展 Markdown 渲染流程，不改变页面源文件。
    markdown: {
      // 注册代码块文件图标 Markdown 插件，配套 Vite 插件提供资源。
      config(md) {
        md.use(groupIconMdPlugin)
      },
    },
    // 向生成页面的 head 追加资源标签。
    head: [
      [
        'link',
        {
          // 声明资源关系；icon 表示浏览器站点图标。
          rel: 'icon',
          // 资源 URL；以 / 开头时相对站点基础路径读取公开资源。
          href: '/logo.svg',
        },
      ],
    ],
    // 传给 VitePress 内部 Vite 的构建、插件及服务选项。
    vite: {
      // 注册代码块图标资源与动态导航插件，配合上面的 Markdown 渲染扩展。
      plugins: [
        groupIconVitePlugin({
          // JSONC 复用插件的 JSON 图标，适配配置文件页签及独立标题。
          customIcon: { '.jsonc': builtinIcons['.json']! },
        }),
        navigationPlugin(links),
      ],
      // 开发服务选项，仅启动 dev 时生效。
      server: {
        // 监听所有网卡而非仅回环地址，便于局域网预览。
        host: true,
        // 从文档站自己的 .env 读取开发端口，未配置时使用 VitePress 默认端口。
        port: env.VITE_PORT
          ? Number(env.VITE_PORT)
          : undefined,
        // 端口被占用时直接失败，不自动递增到其他端口。
        strictPort: true,
      },
    },
    // 默认 VitePress 主题的展示与导航配置，不改变文档正文。
    themeConfig: {
      // 站点导航使用的公开 Logo 资源路径。
      logo: '/logo.svg',
      // 导航栏显示的站点名称，可独立于页面标题设置。
      siteTitle: 'zzjtnb-lint-config',
      // 配置页面右侧正文目录的标题与层级范围。
      outline: {
        // 当前控件或目录的可见文字标签。
        label: '本页目录',
        // 只将此闭区间内的标题层级加入页内目录。
        level: [2, 3],
      },
      // 配置 Git 更新时间的展示；需顶层 lastUpdated 开启并保留 Git 历史。
      lastUpdated: {
        // 当前导航或提示的可见文字。
        text: '最后更新于',
        // 交给 Intl.DateTimeFormat 的日期格式选项，使用页面语言格式化。
        formatOptions: {
          // 使用中等长度的本地化日期，不自行拼接年月日文本。
          dateStyle: 'medium',
        },
      },
      // 配置正文底部上一页、下一页导航的可见文字。
      docFooter: {
        // 上一页导航的中文标签。
        prev: '上一页',
        // 下一页导航的中文标签。
        next: '下一页',
      },
      // 窄屏侧栏展开按钮的文字。
      sidebarMenuLabel: '目录',
      // 移动端返回顶部控件的文字。
      returnToTopLabel: '返回顶部',
      // 主题切换控件的可访问名称。
      darkModeSwitchLabel: '外观',
      // 切换为浅色主题时的按钮提示。
      lightModeSwitchTitle: '切换为浅色模式',
      // 切换为深色主题时的按钮提示。
      darkModeSwitchTitle: '切换为深色模式',
      // 不存在的文档路由使用的 404 页面文案。
      notFound: {
        // 站点或当前视图的标题，展示于主题提供的标题位置。
        title: '页面不存在',
        // 404 页面中的引导说明。
        quote: '请通过导航或搜索查找需要的文档。',
        // 404 返回链接的可访问标签。
        linkLabel: '返回首页',
        // 404 返回链接的可见文字。
        linkText: '返回首页',
      },
      ...navigation,
      // 配置文档搜索引擎及其界面文案。
      search: {
        // 使用本地全文索引搜索，不依赖外部搜索服务。
        provider: 'local',
        // 传给当前搜索或任务对象的附加选项，仅在所属功能启用时使用。
        options: {
          // 按站点语言覆盖搜索界面文案，不改写索引内容。
          locales: {
            // 为站点默认语言覆盖本地搜索文案。
            root: {
              // 本地搜索组件的中文文案覆盖。
              translations: {
                // 搜索触发按钮的可见文字及可访问名称。
                button: {
                  // 搜索按钮显示的文字。
                  buttonText: '搜索',
                  // 为辅助技术提供完整的搜索按钮名称。
                  buttonAriaLabel: '搜索文档',
                },
                // 搜索弹层的提示、按钮与键盘操作文案。
                modal: {
                  // 展开搜索结果详细信息的操作文字。
                  displayDetails: '显示详细结果',
                  // 清空搜索输入按钮的提示。
                  resetButtonTitle: '清除查询条件',
                  // 关闭搜索弹层按钮的提示。
                  backButtonTitle: '关闭搜索',
                  // 搜索结果为空时显示的文字。
                  noResultsText: '未找到相关结果',
                  // 当前主题区域的页脚文案配置。
                  footer: {
                    // 搜索页脚中选择当前结果的操作提示。
                    selectText: '选择',
                    // 确认选择按键的可访问名称。
                    selectKeyAriaLabel: '回车键',
                    // 搜索页脚中切换结果的操作提示。
                    navigateText: '切换',
                    // 向上切换结果按键的可访问名称。
                    navigateUpKeyAriaLabel: '上方向键',
                    // 向下切换结果按键的可访问名称。
                    navigateDownKeyAriaLabel: '下方向键',
                    // 搜索页脚中关闭弹层的操作提示。
                    closeText: '关闭',
                    // 关闭弹层按键的可访问名称。
                    closeKeyAriaLabel: 'Escape 键',
                  },
                },
              },
            },
          },
        },
      },
      // 在导航中显示外部社区或代码仓库链接。
      socialLinks: [
        {
          // 选择主题内置图标，github 对应代码仓库图标。
          icon: 'github',
          // 该导航项实际打开的地址；外部地址保留完整协议。
          link: 'https://github.com/zzjtnb/zzjtnb-lint-config',
        },
      ],
      // 当前主题区域的页脚文案配置。
      footer: {
        // 站点页脚的许可证说明。
        message: 'MIT License',
        // 站点页脚的版权署名。
        copyright: 'Copyright © 2022 争逐',
      },
    },
  })
}
