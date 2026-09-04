# VitePress 主题选型与定制指南

## 结论

面向技术读者、以配置说明和代码示例为主要内容的文档站，采用 **官方默认主题扩展**：继承 `DefaultTheme`，通过 CSS 变量、首页配置和必要的布局插槽完成定制。

VitePress 初始化时选择：

```text
Theme:
  ○ Default Theme
  ● Default Theme + Customization (Add custom CSS and layout slots)
  ○ Custom Theme
```

这是在保留官方文档交互的基础上建立品牌外观，不是安装另一套社区主题，也不是从零编写全站布局。本站的品牌色、首页布局和验收要求见[视觉设计方案](./design.md)。

## 三个选项分别意味着什么

| 选项 | 适用情况 | 定制和维护边界 |
| --- | --- | --- |
| Default Theme | 默认外观已满足需求，主要编写内容 | 使用官方主题配置；以后仍可增加自定义主题入口 |
| Default Theme + Customization | 保留默认主题功能，同时修改品牌、样式或布局局部 | 脚手架提供扩展入口，继承默认主题并加载自定义样式；本站采用此项 |
| Custom Theme | 默认主题的结构无法满足产品要求，需要自行维护主题 | 自行提供布局与相关组件；可复用公开能力，但不能假设默认主题所有交互仍自动存在 |

前两个选项并不是不同等级的主题引擎。第二项主要帮助建立定制入口，后续能力来自默认主题本身及其公开扩展机制。

第三方社区主题是另一种路线，不属于上面三个选项中的独立内置选项。是否采用取决于其内容模型、可访问性、维护状态、版本兼容和实际设计需求；不能笼统认定所有社区主题都不适合技术文档。

## 为什么本站选择扩展默认主题

本站需要的核心能力是导航、侧边栏、正文目录、代码复制、搜索、多语言和移动端阅读。默认主题已提供相应组件或配置入口，重新实现这些交互并不能直接改善内容质量。

视觉识别可以通过品牌色、背景表面、首页 Hero、卡片、边框及少量布局样式建立，不需要放弃默认主题。只有出现默认结构无法表达的真实需求，才引入插槽组件；不为了看起来定制得更多而复制整页布局。

继承主题能够减少重复实现，但不保证升级完全兼容，也不意味着零维护。尤其是针对内部 DOM 类的 CSS、第三方插件和预发布版本，升级后必须回归。

## 项目根目录、源目录和主题目录

本站结构为：

```text
docs/
├── .vitepress/
│   ├── config.ts
│   └── theme/
│       ├── index.ts
│       └── styles/
│           ├── variables.scss
│           └── custom.scss
├── src/
│   ├── index.md
│   ├── quick-start.md
│   ├── theme.md
│   ├── design.md
│   ├── en/
│   └── public/
└── package.json
```

`docs/` 是 VitePress 项目根目录；配置使用 `srcDir: 'src'` 后，`docs/src/` 是 Markdown 源目录。`srcDir` 相对于项目根目录解析，不需要把 `.vitepress/` 移入 `src/`。

源目录本身不进入访问路径：`src/quick-start.md` 对应 `/quick-start`，`src/en/quick-start.md` 对应 `/en/quick-start`。`guide/` 不是必需目录，内容分组可由侧边栏表达。

主题指南与视觉设计方案均位于 `src/`，通过侧边栏进入公开页面。公共图片位于 `src/public/`，正文通过 `/logo.svg` 等站点资源路径引用。

## 扩展入口的标准写法

`.vitepress/theme/index.ts`：

```ts
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import 'virtual:group-icons.css'
import './styles/variables.scss'
import './styles/custom.scss'

export default {
  extends: DefaultTheme,
} satisfies Theme
```

`extends` 保留默认主题提供的行为，样式导入覆盖需要调整的外观。`satisfies Theme` 检查主题对象的契约，不创建运行时包装。

其中 `virtual:group-icons.css` 属于本站选择的图标插件，不是继承官方主题的必需代码。其他站点未使用该插件时不应照搬这一行。

本站使用 SCSS，需要在文档工作区直接声明编译依赖；使用普通 CSS 的站点可直接导入 `.css`，不必仅为主题定制增加预处理器。

## 定制的三个层级

### 1. 优先使用主题配置

导航、侧边栏、搜索、首页、页脚及语言文案优先通过官方配置实现，不用 CSS 模拟。

首页 `index.md` 使用 `layout: home`、`hero` 和 `features`。卡片的标题、描述、图标及链接放在 frontmatter，不为三张标准卡片另写一套 Vue 组件。

### 2. 使用 CSS 变量和少量样式

`variables.scss` 维护实际需要调整的品牌、深浅色及表面变量：

```scss
:root {
  --vp-c-brand-1: #175cd3;
  --vp-c-brand-2: #1554bd;
  --vp-c-brand-3: #175cd3;
  --vp-c-brand-soft: rgb(23 92 211 / 10%);
}

.dark {
  --vp-c-brand-1: #8cbcff;
  --vp-c-brand-2: #a8ccff;
  --vp-c-brand-3: #175cd3;
  --vp-c-brand-soft: rgb(140 188 255 / 13%);
}
```

这些颜色应结合实际文字和背景检查对比度，不能因为定义了 `.dark` 就认为深色模式已验收。

`custom.scss` 只处理变量无法表达的 Hero 背景、卡片状态和导航细节。毛玻璃是可选的视觉效果，不是高质量主题的必要条件；需要考虑不支持时的回退、移动端开销及文字可读性。

### 3. 确有结构需求再使用布局插槽

只有要插入默认首页配置无法表达的内容时，才增加组件并使用公开插槽，例如：

```ts
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { h } from 'vue'
import HomeNotice from './components/HomeNotice.vue'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {
    'home-hero-before': () => h(HomeNotice),
  }),
} satisfies Theme
```

此示例要求实际实现 `HomeNotice.vue`，不是本站当前存在的组件。没有对应内容时，不添加空插槽函数、占位组件或空目录。扩展布局时仍保留已有样式导入。

## 插件与在线图标的取舍

| 能力 | 本站选择 | 职责与限制 |
| --- | --- | --- |
| 搜索 | 官方本地搜索 | 通过 `themeConfig.search` 配置，不另装重复搜索方案 |
| 页面更新时间 | 官方 `lastUpdated` | 来自文件 Git 历史，不等于包版本发布说明 |
| 代码组图标 | `vitepress-plugin-group-icons` | Markdown、Vite 插件和主题 CSS 三处接入，需要版本回归 |
| 首页工具图标 | Iconify 在线 SVG | 不使用文字冒充图标；显示依赖第三方网络与服务可用性 |
| PWA | 不启用 | 有离线需求后再设计缓存、失效和更新提示 |
| 完整 Git 变更记录 | 不启用 | 提交历史、更新时间和产品变更说明不是同一概念 |
| 图片缩放 | 暂不启用 | 有实际截图或大图阅读需求后再接入并检查生命周期 |

在线图标可直接使用官方主题的图片对象：

```yaml
icon:
  src: https://api.iconify.design/logos/eslint.svg
  alt: ESLint
  width: 32
  height: 32
  wrap: true
```

单色图标需考虑深浅色，可使用 `light` 与 `dark` 指向不同颜色的 SVG。图标库中的通用 Markdown 标识不应被描述成 Markdownlint 专属官方 Logo。

不要同时维护无必要的本地图片和在线图片副本。需要离线或更严格可用性时，应重新选择本地构建打包方案，而不是给图片加载增加不透明的静默兜底。

## 自动路由、页面元数据与导航的区别

VitePress 根据 Markdown 文件自动生成路由；本站没有另建路由注册表。frontmatter 用于页面标题、首页布局和其他页面元数据，HTML `meta` 则属于页面头部信息，二者都不是默认主题的自动侧边栏生成器。

`nav` 与 `sidebar` 维护阅读入口、分组及顺序，不决定页面能否访问。本站由 `.vitepress/navigation.ts` 读取页面 frontmatter 生成两者，链接由文件路径推导，不再在配置中逐页维护。正文内部标题目录仍由官方主题按标题层级生成。

正文页面声明导航短标题、分组和顺序：

```yaml
---
navigation:
  text: ESLint
  group: configuration
  order: 10
---
```

`group` 可取 `start`、`configuration`、`engineering`；组顺序和中英文组名集中维护在生成器中。`order` 是同语言同组内唯一的非负整数，按升序展示。顶栏每组链接到排序后的第一页。中文文件位于源目录根，英文位于 `en/`，两者分别生成导航。首页 `layout: home` 自动排除；其他不需要入口的页面显式使用 `navigation: false`。缺失或无效元数据、同组顺序冲突会阻止配置加载，不静默遗漏页面。

开发时正文修改使用 VitePress HMR；新增、移除页面，或导航标题、分组、顺序变化时，插件重新加载开发服务器配置。导航短标题放在 `navigation.text`，正文和 SEO 标题仍由页面一级标题提供。

VitePress 2 的 `createContentLoader` 可以读取 frontmatter，但要求站点配置已解析，不能在根配置初始化时调用。本站仅在这个配置边界使用 `gray-matter`，不修改默认主题，也不另建路由表。分布式配置 `additionalConfig` 用于目录级配置覆盖，并不是默认主题自动生成侧边栏的开关。

独立工作台不从文档页面生成入口。开发时通过 `.env.development` 默认指向 `http://localhost:3001/`；发布构建通过 `.env.production` 或进程环境变量 `PLAYGROUND_URL` 指定完整 HTTP 或 HTTPS 地址（进程环境变量优先于 `.env` 文件）。未提供时不生成在线入口，不回退到说明页或本机地址。站内 `/playground` 仅作为使用说明保留在侧边栏。

## 验证与升级

主题交付至少区分以下证据：

1. 配置、SCSS 和 Markdown 的静态检查。
2. VitePress 客户端、服务端构建及所有页面渲染。
3. 实际浏览器中的首页、长文、搜索、导航、代码组及语言切换。
4. 深浅色和手机、平板、桌面布局，包括长标题、长代码与表格。
5. 键盘焦点、减少动态效果及关键配色对比度。
6. 在线资源失败边界与插件版本兼容性。

格式检查不能替代浏览器验收，构建成功不能证明移动端菜单、深色对比度或第三方资源可用。VitePress 升级后，按本站[视觉设计方案](./design.md#验收)回归，而不是承诺长期零维护。

## 官方参考

- [扩展默认主题](https://vitepress.dev/zh/guide/extending-default-theme)
- [自定义主题](https://vitepress.dev/zh/guide/custom-theme)
- [路由与源目录](https://vitepress.dev/zh/guide/routing)
- [默认主题配置](https://vitepress.dev/zh/reference/default-theme-config)
- [首页](https://vitepress.dev/zh/reference/default-theme-home-page)
- [最后更新时间](https://vitepress.dev/zh/reference/default-theme-last-updated)

配置与类型以项目实际安装的 VitePress 版本为准；本站使用 VitePress 2 预发布线，不能把稳定版文档页面视为所有预发布行为的完整保证。
