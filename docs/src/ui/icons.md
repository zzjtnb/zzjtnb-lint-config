---
navigation:
  text: 图标方案对比
  group: ui
  order: 30
---

# 图标方案对比与选择

图标方案不只有 Iconify。选型时要分别决定：采用哪套视觉风格、从哪里获取图标、以及通过 SVG、Vue 组件、CSS 或字体渲染。Iconify 是聚合多个图标集合并提供工具的生态；Lucide、Tabler、Heroicons 等是具有自身设计风格的图标集合。它们不是完全互斥的选择，例如可以通过 Iconify 获取 Lucide，也可以直接使用 Lucide 的 Vue 组件。

## 官方预览与搜索入口

- [Iconify 图标搜索](https://icon-sets.iconify.design/)：跨集合查找图标、查看标识和使用方式。
- [Icônes](https://icones.js.org/)：按集合预览和搜索，适合挑选统一风格的图标。
- [Lucide](https://lucide.dev/)：预览线性图标及各框架用法。
- [Tabler Icons](https://tabler.io/icons)：浏览线性与填充图标。
- [Heroicons](https://heroicons.com/)：浏览 outline、solid 等不同规格的图标。
- [Material Symbols](https://fonts.google.com/icons)：搜索 Google 的 Material 图标并调整可变字体参数。
- [Font Awesome](https://fontawesome.com/)：搜索图标、区分免费与付费内容及可用样式。
- [Bootstrap Icons](https://icons.getbootstrap.com/)：浏览 SVG 与图标字体，不要求应用使用 Bootstrap 组件库。
- [Remix Icon](https://remixicon.com/)：浏览线性与填充风格图标。
- [Simple Icons](https://simpleicons.org/)：查找品牌标识；使用前同时核对品牌规范。

## 1. 先区分三个层次

| 层次 | 决定什么 | 示例 |
| --- | --- | --- |
| 图标集合 | 图形设计、线宽、尺寸网格、填充方式和覆盖范围 | Lucide、Tabler、Heroicons、Material Symbols |
| 获取与管理工具 | 搜索、聚合集合、提供数据或生成导入 | Iconify、Icônes、构建工具插件 |
| 应用接入方式 | 图标如何进入页面、是否需要运行时请求、如何控制颜色 | 内联 SVG、Vue 组件、CSS 图标、SVG sprite、图标字体 |

例如“选择 Lucide 风格，用本地 Iconify 数据生成 UnoCSS 图标”同时指定了集合、数据来源和渲染方式。只说“使用 Iconify”还没有决定视觉风格和运行时行为。

## 2. 常见集合与生态对比

| 方案 | 主要特点 | 适合用途 | 采用前核对 |
| --- | --- | --- | --- |
| [Iconify](https://iconify.design/) | 聚合大量不同来源集合，提供数据、组件与工具 | 跨集合搜索、统一标识和工具链接入 | 具体集合风格与许可；本地数据和在线 API 是不同接入方式 |
| [Lucide](https://lucide.dev/) | 统一线性风格，提供 Vue 等框架组件 | 应用导航、按钮和状态图标 | 所需业务图标是否覆盖、线宽与尺寸是否符合产品 |
| [Tabler Icons](https://tabler.io/icons) | 大量线性与填充图标，提供框架集成 | 后台、工具型应用和较广的业务类别 | 统一使用哪种风格；不要随意混用线性和填充版本 |
| [Heroicons](https://heroicons.com/) | 提供多种尺寸与 outline、solid 规格，有官方 Vue 包 | 希望采用其视觉语言的 Web 界面 | 按展示尺寸选择规格，导入路径对应具体尺寸与风格 |
| [Material Symbols](https://fonts.google.com/icons) | Material 风格，支持填充、粗细、等级与光学尺寸等可变参数 | Material 设计体系与需要统一参数调整的界面 | 使用字体还是 SVG；自托管、字体加载与参数支持 |
| [Font Awesome](https://fontawesome.com/) | 提供多种风格、品牌图标及免费和付费方案 | 已采用其生态或需要特定图标覆盖的项目 | 目标图标与风格是否免费；SVG、字体、组件和 Kit 的配置及授权不同 |
| [Bootstrap Icons](https://icons.getbootstrap.com/) | 通用 SVG 集合，也提供字体方式 | 常规业务界面，不限定 Bootstrap 技术栈 | 实际风格、导入方式与是否需要本地托管字体 |
| [Remix Icon](https://remixicon.com/) | 线性与填充风格，覆盖常用界面元素 | 需要成套 line/fill 状态表达的界面 | 图标名称、对应风格以及目标版本许可 |
| [Simple Icons](https://simpleicons.org/) | 聚焦品牌标识，不是完整通用操作图标集 | 品牌入口、技术栈展示与第三方服务标识 | 品牌商标、使用规范与颜色要求，不能仅看代码许可 |

图标数量、许可和包导出会随版本变化，应按目标版本的官方说明确认。不要因为搜索网站收录了某个图标，就认为所有来源集合采用同一许可；字体、SVG、代码与商标还可能适用不同条件。

## 3. 在 Vue 项目中如何接入

| 方式 | 优点 | 需要承担的工作 | 适合情况 |
| --- | --- | --- | --- |
| 集合官方 Vue 组件 | 显式导入，props 和类型直接，容易追踪来源 | 管理实际导入与组件命名，核对按需构建 | Vue 项目选定单一集合，不需要额外 CSS 图标工具链 |
| 本地 Iconify 数据 + UnoCSS | 模板用类名，按提取到的类生成 CSS，浏览器不必请求图标 API | 配置 Icons 预设、安装集合、处理动态类名扫描 | 已使用 UnoCSS，希望统一工具类与图标样式 |
| Iconify 组件与图标数据 | 用统一组件接入多个集合 | 根据使用方式管理本地数据或远程 API、SSR 和加载状态 | 确实需要跨集合或动态标识的场景 |
| 内联 SVG 或项目 SVG 组件 | 对 viewBox、路径和多色细节控制直接 | 维护资产、无障碍和命名，避免重复大段路径 | 自有品牌、少量定制图标和插画 |
| SVG sprite | 多处引用符号，适合集中维护资产 | 建立生成流程、唯一 ID 和外部资源路径规则 | 已有统一 SVG 资产管线的应用 |
| 图标字体 | 通过字体与 CSS 使用，适合既有字体方案 | 字体加载、自托管、字符或连字映射及失败回退 | 既有系统或明确需要可变字体参数的方案 |

### 直接使用 Lucide Vue 组件

在消费应用目录安装运行时依赖：

```bash
pnpm add lucide-vue-next
```

```vue [src/components/HelpLink.vue]
<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next'
</script>

<template>
  <a class="help-link" href="/help">
    <CircleHelp :size="20" :stroke-width="2" aria-hidden="true" />
    使用帮助
  </a>
</template>

<style>
.help-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
</style>
```

`size` 设置图标宽高，Lucide 默认尺寸为 24；`stroke-width` 设置描边宽度，默认值为 2。颜色默认使用 `currentColor`，可随链接文字颜色变化。此方式无需 UnoCSS、Iconify API 或 `@iconify-json/lucide`；按实际用到的组件具名导入，不为了动态名称导入全部图标。完整 props 与用法见 [Lucide Vue 指南](https://lucide.dev/guide/packages/lucide-vue-next)。

Heroicons 等集合也有自己的官方 Vue 接入；组件名、尺寸路径和 props 不能机械照搬 Lucide。不要仅为显示图标而安装完整 UI 组件库。

### 已使用 UnoCSS

继续使用 [UnoCSS 页的图标用法](./unocss#_4-使用与查找图标)，其中集中维护 `presetIcons`、本地集合、图标类名、自定义 SVG、动态类名和排查。本文比较图标方案，不再重复那套配置。

### 需要动态图标

有限的业务状态优先维护明确的标识或组件映射，例如成功、失败和加载分别选择固定图标。不要让后端任意字符串直接决定一个不存在的本地组件。

使用 Iconify 组件时，要明确图标数据是随包提供、由应用预加载，还是运行时向 API 请求。只有标识字符串并不证明数据已离线可用。动态图标、SSR 和 API 配置应按 [Iconify 官方文档](https://iconify.design/docs/)选择对应集成后验证，不把 CSS 图标、Vue 组件和 Web Component 的 API 混用。

## 4. 怎样保持视觉一致

- 导航和操作尽量使用同一主集合；品牌标识可采用专门集合。
- 统一常用尺寸、描边和对齐方式，避免把不同网格的 SVG 强行拉伸。
- 单色图标可继承文字颜色，多色或品牌图标按原有设计与规范处理。
- 选中状态可以用线性与填充切换，但同时提供可识别的控件状态，不只依赖颜色。
- 产品独有图标归应用资产维护，既有集合优先复用，不为每个按钮重新绘制近似图形。

## 5. 无障碍与实际验收

图标旁已有“保存”等文字时，将图标设为装饰性并使用 `aria-hidden="true"`。只有图标的操作应由真正的按钮或链接承载，并在控件上设置名称：

```html
<button type="button" aria-label="关闭帮助">
  <!-- 放置所选方案生成的装饰性图标，并设置 aria-hidden="true"。 -->
</button>
```

工具提示可以补充说明，但不能替代按钮可访问名称。成功、失败和加载应有文字或相应状态反馈，不只显示一个颜色不同的图标；动画尊重系统减少动态效果的偏好。

验收时核对浅色与深色背景下的对比度、键盘焦点、触屏点击区域、缩放与文字对齐，以及生产构建后的图标显示。声称离线可用时，阻止远程图标或字体服务后重新加载验证；采用运行时请求时，要核对网络失败与 SSR 首屏表现。

## 6. 按需求选择

| 需求 | 可以先试 |
| --- | --- |
| Vue 项目，想用统一线性图标并显式导入 | Lucide 或 Tabler 的官方 Vue 组件 |
| 已有 UnoCSS，想通过类名使用图标 | 本地 Iconify 集合 + UnoCSS Icons 预设 |
| 想找图标但还没确定风格 | Iconify / Icônes 搜索，再回到集合官方预览确认 |
| Material 设计与可变参数 | Material Symbols，并明确字体或 SVG 接入 |
| 需要品牌标识 | Simple Icons、Font Awesome 品牌部分或品牌官方资产，核对使用规范 |
| 少量定制图形且需要多色细节 | 项目本地 SVG 组件或现有资产管线 |

选定方案后记录主集合、接入方式和例外用途，后续图标沿用同一套约定。UI 组件库的选型见 [组件方案对比](./)，与 Reka UI 配合的用法见 [Reka UI 教程](./reka-ui)。
