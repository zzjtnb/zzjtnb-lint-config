---
navigation:
  text: 组件方案对比
  group: ui
  order: 0
---

# Vue UI 组件方案对比

选择 UI 方案，先看需要哪些组件、愿意维护多少样式，以及组件源码由谁维护。Reka UI、shadcn-vue 和 Naive UI 解决的问题不同，不能仅凭外观、组件数量或下载量判断哪个更适合。

本文面向 Vue 3 项目。以下项目名称均链接到官方文档，可直接查看组件演示、安装要求和 API；具体版本兼容、维护状态与许可应在采用前按目标版本核对。

## 先分清三种交付方式

| 类型 | 提供什么 | 使用方主要维护什么 | 代表方案 |
| --- | --- | --- | --- |
| 无样式交互组件 | 状态、键盘操作、焦点与 ARIA 等交互基础 | 视觉样式、业务组合、应用级可访问性验收 | Reka UI、Headless UI |
| 可加入项目的组件源码 | 有设计风格的组件实现与组合方式 | 加入项目后的源码、样式、上游修复合并 | shadcn-vue |
| 带主题的组件库 | 可直接使用的组件、默认视觉与主题配置 | 主题调整、业务逻辑、版本升级和集成 | Naive UI、Element Plus、Ant Design Vue、PrimeVue、Vuetify、Nuxt UI |

分类不是绝对互斥：PrimeVue 也提供无样式模式；Nuxt UI 使用 Reka UI 构建交互。无样式组件仍可能输出定位或交互所需的样式，它表示没有替你决定完整视觉设计，并不保证所有元素都没有内联样式。

## 常用方案对比

| 方案与官方入口 | 定位与样式方式 | 适合的任务 | 采用前重点确认 |
| --- | --- | --- | --- |
| [Reka UI](https://reka-ui.com/) | Vue 无样式交互组件；可配合普通 CSS、UnoCSS 或其他样式方案 | 自建设计系统，需要掌握控件外观与组合结构 | 团队是否能维护样式、组件封装与键盘验收；复杂表格等需求要单独选型 |
| [shadcn-vue](https://www.shadcn-vue.com/) | 基于 Reka UI 等能力提供可加入项目的组件源码，采用 Tailwind CSS 设计方式 | 想获得现成视觉起点，同时直接修改组件实现 | 生成文件归项目维护；核对当前 CLI、Tailwind、别名和 CSS 配置，升级时处理本地差异 |
| [Naive UI](https://www.naiveui.com/) | Vue 3 完整组件库，提供主题与 TypeScript 配置能力 | 管理后台、表单、数据展示，需要较快交付 | 表格、表单、弹层与主题接口是否满足实际页面；按组件要求配置 Provider |
| [Element Plus](https://element-plus.org/) | 面向 Vue 3 的成套组件与主题系统 | 常规后台、业务表单和数据操作界面 | 按需导入、主题覆盖、国际化、表格大数据与弹层使用方式 |
| [Ant Design Vue](https://antdv.com/) | 基于 Ant Design 设计体系的 Vue 组件 | 采用 Ant 视觉规范的企业应用 | 选择支持 Vue 3 的版本；核对该版本的主题、表单和日期相关依赖 |
| [PrimeVue](https://primevue.org/) | 丰富业务组件，同时有带主题与无样式用法 | 需要复杂数据组件，并希望选择主题或自行控制外观 | 核对当前官方维护与授权方案、目标版本及附加产品范围，不假设历史版本政策永远适用 |
| [Vuetify](https://vuetifyjs.com/) | 以 Material Design 为核心的 Vue UI 框架 | 明确采用 Material 设计语言的应用 | 设计风格是否匹配；核对 Vue 版本、全局配置、布局与主题体系 |
| [Nuxt UI](https://ui.nuxt.com/) | 基于 Reka UI、Tailwind CSS 等的带主题组件；支持 Nuxt 和 Vue/Vite 接入 | 希望复用现成主题与组件，并采用其样式生态 | 按应用类型选择安装指南；不要将 Nuxt 模块配置直接复制进普通 Vite 项目 |
| [Headless UI](https://headlessui.com/v1/vue) | 提供 Vue 无样式交互组件，与 Tailwind 使用方式相配合 | 需要其现有控件集合，并自行编写外观 | Vue 与 React 文档、版本及组件范围分开核对，不照搬另一框架的 API |

这里比较的是组件方案，不是对全部 Vue 组件库的排名。移动端为主的项目还应单独评估 [Vant](https://vant-ui.github.io/vant/)，组件行为、触屏布局和业务场景与桌面后台不同。

PrimeVue 的[官方仓库说明](https://github.com/primefaces/primevue)目前声明该仓库仅接收安全修复，后续开发转入 PrimeUI，并说明已经发布的 MIT 版本维持原许可。评估新项目时应同时查看其链接的当前产品、维护和授权说明，不把旧仓库的许可与维护范围直接套到后续产品。

## Reka UI、shadcn-vue 与 Naive UI 怎么选

| 当前目标 | 优先试验 | 原因与代价 |
| --- | --- | --- |
| 已有 UnoCSS 和自己的设计规范，需要精细控制交互控件 | Reka UI | 不要求引入 Tailwind；自己负责组件样式、状态外观与封装 |
| 喜欢 shadcn 风格，希望组件源码在项目内可直接改 | shadcn-vue | 能获得现成实现起点，但生成源码与上游差异需要自己维护 |
| 主要是后台表单、表格和批量操作，先满足业务覆盖 | Naive UI、Element Plus 或 Ant Design Vue | 成套组件能减少自行组合工作；仍需验证主题和复杂业务能力 |
| 已采用 Nuxt/Tailwind，希望使用整合后的主题组件 | Nuxt UI | 安装和主题方式更贴合该生态；普通 Vue 也要按相应指南接入 |

Reka UI 负责的主要是交互基础，shadcn-vue 在其上提供可修改的组件实现，Naive UI 则通过安装的组件库提供成套 API。Reka UI 的升级不会自动修改项目里的 shadcn-vue 源码，也不能直接把 Naive UI 的 props 套到 Reka UI 组件上。

## 与 UnoCSS、图标和检查工具的关系

- Reka UI 可直接用 UnoCSS 工具类编写外观，基础配置见 [UnoCSS 与图标](/ui/unocss)。
- shadcn-vue 与 Nuxt UI 的官方样式方案使用 Tailwind CSS，不能因为类名相似就直接替换成 UnoCSS；替换涉及变量、变体、插件、reset 与构建方式，需要独立验证。
- 图标由组件方案或应用选择，不是所有库都使用同一图标包。使用本地 Iconify CSS 图标时，仍需配置 UnoCSS Icons 预设与对应集合。
- ESLint、Stylelint 和 Markdownlint 检查不代表控件的焦点、读屏与触屏行为已经通过验收。使用无障碍组件也仍需正确提供标签、描述、错误提示和对比度。

## 用真实页面选型

选一个有代表性的页面，包含输入与校验、表格或列表、弹窗、下拉选择、异步提交、加载失败和空态。分别核对：

1. 所需组件是否已有，以及缺少的能力要自己补多少代码。
2. 默认视觉是否符合产品，主题调整能否通过公开接口完成。
3. Tab、Shift+Tab、Enter、空格、Escape 和方向键操作是否符合对应控件行为。
4. 深色模式、窄屏、触屏、长文本、中文输入与本地化是否正常。
5. SSR、弹层挂载、表单状态、按需导入和实际生产产物是否符合应用要求。
6. 当前许可证、维护政策、升级记录与团队可承受的维护工作量。

不要同时让多个组件库负责同一套按钮、弹层和主题状态。确需混用时，先明确组件归属，再验证 reset、层级、Portal、焦点管理和 CSS 变量是否互相影响。

## 继续学习

- [图标方案对比与选择](./icons)：区分 Iconify、常见图标集合及 Vue、SVG、CSS、字体接入方式。
- [Reka UI 接入与使用](./reka-ui)：从 Dialog、Select 开始，了解状态、组合、UnoCSS 样式和验收。
- [UnoCSS 与图标](/ui/unocss)：配置工具类、图标、主题和源码扫描。
