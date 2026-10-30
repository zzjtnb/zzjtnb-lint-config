---
navigation:
  text: UnoCSS 与图标
  group: ui
  order: 20
---

# UnoCSS 与图标

如果尚未选定图标方案，先看[图标方案对比与选择](./icons)；本文保留使用 UnoCSS 生成图标所需的配置与操作。

UnoCSS 按源码中使用的工具类生成 CSS；Iconify 提供多个图标集合，可以通过 UnoCSS 的 Icons 预设按需生成 CSS 图标。学习、试用和查找图标可以从以下入口开始：

- [UnoCSS 官方文档](https://unocss.dev/)：查询安装方式、配置、预设与框架集成。
- [UnoCSS 官方教程](https://tutorial.unocss.dev/)：通过交互练习学习工具类和基本用法。
- [UnoCSS 官方 Playground](https://unocss.dev/playground)：在线试写工具类与配置，查看生成的 CSS 和效果。
- [Iconify 图标集合预览（Icônes）](https://icones.js.org)：按集合浏览图标，查找图标名称。
- [Iconify 图标搜索](https://icon-sets.iconify.design/)：跨集合搜索图标，查看图标详情与使用方式。

本教程面向已有的 Vue 3 + Vite 项目，使用 UnoCSS 生成工具类样式，并通过 Iconify 的 Lucide 集合生成 CSS 图标。UnoCSS 负责生成 CSS；本仓库的 ESLint 配置负责检查和排序类名，Stylelint 配置负责检查样式文件，两者不会替代 UnoCSS。

在线 Playground 使用它当前的版本与配置，不会自动读取本地 `uno.config.ts` 或已安装的图标集合。试验时先对齐预设与配置，接入后再在实际应用中验证。UnoCSS 的其他框架接入方式见[官方集成列表](https://unocss.dev/integrations/)。

## 1. 安装到实际使用的应用

在应用目录执行：

```bash
pnpm add -D unocss @iconify-json/lucide
```

`unocss` 已包含下文使用的 Wind4 和 Icons 预设，不必再单独安装对应预设包。`@iconify-json/lucide` 提供本地图标数据，只安装需要的集合即可，不必安装全部 Iconify 数据。

在 pnpm Monorepo 中，依赖应声明在实际使用 UnoCSS 的应用，而不是只装在工作区根目录。使用 Catalog 管理版本时，按[依赖版本管理](/dependencies)在根目录声明版本、在应用中引用。

## 2. 配置 Vite 与 UnoCSS

在应用现有 Vite 配置中追加插件，保留其他配置和插件：

```ts [vite.config.ts]
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // 保留 Vue 编译插件，追加 UnoCSS；默认使用全局 CSS 模式。
  plugins: [vue(), UnoCSS()],
})
```

在应用根目录创建配置文件：

```ts [uno.config.ts]
import { defineConfig, presetIcons, presetWind4 } from 'unocss'

export default defineConfig({
  // 显式启用工具类和图标预设；此数组决定可生成的规则。
  presets: [
    presetWind4(),
    presetIcons({
      // 未找到图标时输出警告；默认 false，排查名称错误时建议开启。
      warn: true,
      // 默认不附加额外声明；这里统一设置图标的行内布局。
      extraProperties: {
        // 保留图标尺寸并参与文本行布局。
        'display': 'inline-block',
        // 在 Flex 容器中保留图标宽度。
        'flex-shrink': '0',
        // 将行内图标与文字垂直居中对齐。
        'vertical-align': 'middle',
      },
    }),
  ],
})
```

Wind4 提供与 Tailwind CSS 4 风格接近的工具类，但不代表与 Tailwind 的全部功能完全一致，也不需要同时安装 Tailwind。它面向现代浏览器，兼容要求应以 [Wind4 官方说明](https://unocss.dev/presets/wind4)为准。

在应用入口导入生成的样式，保留现有初始化逻辑：

```ts [src/main.ts]
import 'virtual:uno.css'
```

以上是需要合并到入口的导入语句，不是完整的 Vue 启动文件。全局模式默认要求导入此虚拟模块，否则生成的工具类不会进入页面。已有全局样式也应保留，并按所需覆盖顺序安排导入；同等优先级下，后出现的声明优先。

Wind4 内置并默认启用 reset，无需再安装 reset 包。在已有 UI 框架上应核对是否重复重置样式，可用 `presetWind4({ preflights: { reset: false } })` 关闭，`true` 则启用；这只控制 reset，不会关闭工具类生成。

修改依赖声明后需要在对应项目安装依赖；日常修改模板类名或 `uno.config.ts` 不需要重新安装。新增 Vite 插件后重启开发服务，之后模板修改由 Vite 热更新。

## 3. 常用工具类与状态

以下写法使用前文的 Wind4 预设。数字间距通常来自预设的 spacing 标尺，不等于像素；需要固定尺寸时可用方括号任意值。

| 目的 | 示例 | 效果 |
| --- | --- | --- |
| Flex 布局 | `flex items-center justify-between gap-4` | 横向排列、垂直居中、两端对齐并设置间距 |
| Grid 布局 | `grid grid-cols-1 gap-4 md:grid-cols-2` | 默认一列，达到 md 断点后两列 |
| 内外间距 | `p-4 px-6 mt-4 mx-auto` | 内边距、横向内边距、上外边距和水平居中 |
| 宽高 | `w-full max-w-[960px] min-h-[240px]` | 占满容器宽度，同时限定最大宽度和最小高度 |
| 文字 | `text-sm font-medium leading-6` | 字号、字重与行高 |
| 配色 | `bg-white text-slate-900` | 背景与文字颜色 |
| 外观 | `rounded-lg border border-slate-200 shadow-sm` | 圆角、边框与阴影 |
| 任意值 | `w-[18rem] gap-[10px]` | 使用标尺之外的明确尺寸 |
| 交互 | `hover:bg-blue-700 focus-visible:outline-2` | 悬停与键盘焦点状态 |
| 禁用 | `disabled:cursor-not-allowed disabled:opacity-50` | 原生元素处于 disabled 状态时应用样式 |

变体放在类名前，以冒号连接。`hover:` 对应悬停，`focus-visible:` 用于可见焦点，`md:` 是最小宽度断点，因此需要先写基础样式，再增加较宽屏幕的覆盖。不要通过删除焦点轮廓来实现视觉统一；需要调整时，应提供清晰可见的替代样式。

```html
<section class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 md:p-6">
  <article class="rounded-lg border border-slate-200 bg-white p-4 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <h2 class="text-lg font-semibold">检查结果</h2>
    <p class="mt-2 text-sm">按页面宽度排列内容，并适配深色主题。</p>
  </article>
</section>
```

Wind4 默认采用 class 深色模式：在页面祖先元素（通常为 `<html>`）上设置 `class="dark"` 后，`dark:` 类生效；移除后恢复基础样式。应用已有主题管理时复用它，不要再创建一套互相同步的主题状态。也可以通过 `presetWind4({ dark: 'media' })` 跟随系统的 `prefers-color-scheme`；两种方式按应用需求选择。

工具类之间的优先级由生成的 CSS、选择器、层和变体决定，不能依靠交换 HTML `class` 中的顺序解决冲突。避免同时保留 `p-2 p-4` 这类同用途类名；条件样式在绑定中明确选择一个值。

## 4. 使用与查找图标

Lucide 的图标类名格式为 `i-lucide-图标名`，例如 `i-lucide-search`。在 Node.js 构建环境中，Icons 预设会查找已安装的 Iconify 集合，不需要额外注册 `collections`。图标按实际用到的类名生成到 CSS，浏览器不需要请求在线图标服务。

```vue [src/components/HelpLink.vue]
<template>
  <a class="inline-flex items-center gap-2 rounded px-3 py-2 text-blue-600 hover:text-blue-700" href="/help">
    <span class="i-lucide-circle-help text-lg" aria-hidden="true" />
    使用帮助
  </a>
</template>
```

单色 Lucide 图标使用当前文字颜色，`text-blue-600` 等工具类可以控制颜色，`text-lg` 可以控制尺寸。多色图标集合可能使用背景图渲染，不能据此推断所有图标都随文字颜色变化。

图标已有相邻文字说明时，用 `aria-hidden="true"` 避免重复朗读；只有图标的操作要在链接或按钮上提供可访问名称：

```html
<a href="/help" aria-label="使用帮助">
  <span class="i-lucide-circle-help" aria-hidden="true"></span>
</a>
```

可在 [Icônes](https://icones.js.org/collection/lucide) 查找 Lucide 图标。换用其他集合时，安装对应的 `@iconify-json/集合名`，并同步修改类名前缀；图标使用范围与许可应以对应集合说明为准。

### 从搜索结果得到类名

1. 在 Icônes 或 Iconify 搜索目标图标，记录完整标识，如 `lucide:search`，不要只记录显示名称。
2. 集合名前缀 `lucide` 对应依赖 `@iconify-json/lucide`；图标名为 `search`。
3. 使用 `i-lucide-search` 或 `i-lucide:search`。Icons 预设默认前缀是 `i-`，两种分隔形式均可。
4. 在项目中确认生成结果，再按图标集合的许可要求使用。

搜索站点可能提供 SVG、组件或其他框架的复制选项，本教程使用 CSS 类名方式，不需要照搬组件导入代码，也不会自动提供 `<Icon>` 组件或 `<i-lucide-search>` 自定义标签。

### 颜色、尺寸与集合切换

```html
<!-- 图标尺寸默认以 em 为单位；这里明确设置宽高并继承文字颜色。 -->
<span class="i-lucide-search h-6 w-6 text-blue-600" aria-hidden="true"></span>
<!-- 动画尊重减少动态效果的系统偏好，状态文字单独提供。 -->
<span class="i-lucide-loader-circle motion-safe:animate-spin" aria-hidden="true"></span>
<span role="status">正在检查</span>
```

默认图标尺度是 `1em`，也可以用 `text-2xl` 随文字大小调整；需要固定占位时设置 `w-*` 和 `h-*`。单色图标的颜色来自 `currentColor`，多色图标通常保留原始颜色。只有图标的按钮仍需使用真正的 `<button>` 并提供 `aria-label`，不要把普通 `<span>` 变成缺少键盘行为的按钮。

例如换用 Tabler 集合，在应用目录安装：

```bash
pnpm add -D @iconify-json/tabler
```

随后使用 `i-tabler-search`，Lucide 与 Tabler 可以同时存在。安装多个集合后也只会按提取到的类名生成对应图标。不要将线上搜索服务的可用性当成本地安装成功的依据；本教程的本地数据方案在构建后不依赖图标 API。

### 自定义 SVG 图标

少量项目自有图标可以直接在原有 `presetIcons()` 选项中合并 `collections`：

```ts
// 默认从已安装集合解析；custom 为本项目定义的集合名。
collections: {
  custom: {
    // SVG 必须带 viewBox；currentColor 使这个单色图标继承文字颜色。
    diamond: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 22 12 12 22 2 12Z"/></svg>',
  },
},
```

模板使用 `class="i-custom-diamond text-blue-600"`。此字段属于 `presetIcons({ ... })`，不是 `defineConfig` 顶层。仅处理自己维护或已审核的 SVG；需要保留多色图标时不要把全部 fill 一律替换成 `currentColor`。图标较多时可使用官方 [FileSystemIconLoader](https://unocss.dev/presets/icons#filesystemiconloader) 从目录读取 SVG，按其说明在应用中声明 `@iconify/utils`，不必把大量 SVG 字符串塞进配置。

## 5. 动态类名与源码扫描

UnoCSS 从源码提取类名，不会执行运行时的字符串拼接。不要依赖 `i-lucide-${name}` 或 `text-${color}-600` 自动生成所有可能样式。有限选项可以直接写出完整类名：

```vue [src/components/ResultIcon.vue]
<script setup lang="ts">
defineProps<{ success: boolean }>()
</script>

<template>
  <span
    :class="success ? 'i-lucide-check text-green-600' : 'i-lucide-x text-red-600'"
    aria-hidden="true"
  />
  <span>{{ success ? '检查通过' : '检查失败' }}</span>
</template>
```

确实来自外部数据、无法在扫描源码中出现的有限类名，可以在 `uno.config.ts` 顶层增加 `safelist`：

```ts
// 默认不强制生成额外类名；仅为确定需要的类名补充此列表。
safelist: ['i-lucide-check', 'i-lucide-x'],
```

这是一段配置字段，需要合并到 `defineConfig({ ... })`，不是独立文件。只列出实际需要的完整类名，不把整个图标集合加入列表。提取范围和其他方式见 [Extracting & Safelist](https://unocss.dev/guide/extracting)。

### 扫描范围

默认构建管线会提取 Vue、HTML、JSX 等支持文件中的类名，普通 `.js`、`.ts` 文件默认不在管线的提取范围内。如果把类名映射移到 TypeScript 文件、从 Markdown 生成页面或引用工作区外的模板，应显式纳入所需输入。例如在应用根 `uno.config.ts` 顶层增加：

```ts
// 追加实际要扫描的磁盘文件；此示例路径相对运行 UnoCSS 的应用根目录。
content: {
  filesystem: ['src/**/*.{vue,html,js,ts,jsx,tsx,md}'],
},
```

这会补充磁盘扫描，不要求关闭默认管线提取。目录、扩展名和相邻工作区路径按实际输入修改，不要直接扫描整个 `node_modules`。未引用的文件也可能被磁盘扫描生成样式，因此范围应限制为真实来源。对于有限的外部数据类名，优先使用明确的映射或 `safelist`，无需扩大扫描到所有文件。

## 6. 快捷类与指令转换

反复出现的工具类组合可以在 `uno.config.ts` 顶层用 `shortcuts` 命名，模板仍通过普通 `class` 使用它：

```ts
// 默认没有项目自定义快捷类；这里为重复的链接样式提供一个名称。
shortcuts: {
  'help-link': 'inline-flex items-center gap-2 rounded px-3 py-2 text-blue-600 hover:text-blue-700',
},
```

将此字段合并到现有 `defineConfig({ ... })` 后，模板可写 `class="help-link"`，图标类名仍按具体图标单独填写。只为实际重复且用途明确的组合命名；完整规则见 [Shortcuts](https://unocss.dev/config/shortcuts)。

如需在样式中使用 `@apply`，从 `unocss` 导入并在配置顶层启用转换器，保留已有预设：

```ts [uno.config.ts（启用指令的完整示例）]
import { defineConfig, presetIcons, presetWind4, transformerDirectives } from 'unocss'

export default defineConfig({
  // 生成工具类与图标；图标的额外布局选项可沿用前文配置。
  presets: [presetWind4(), presetIcons()],
  // 默认不启用指令转换；添加后在构建流程中转换 @apply 等指令。
  transformers: [transformerDirectives()],
})
```

```css
.help-link {
  @apply inline-flex items-center gap-2;
}
```

这是另一种配置示例，已有配置应合并 `transformers` 并保留原有选项。普通模板工具类与图标不需要此转换器；不要只为使用图标而启用它。完整语法见 [Directives](https://unocss.dev/transformers/directives)。

## 7. 主题、自定义规则与可选语法

这些功能按需添加，不是基本接入的必选项。以下字段都应合并到同一份 `uno.config.ts`，避免用后一个示例覆盖前一个配置。

### 主题与自定义规则

```ts
// 扩展预设主题；未修改的主题项继续由预设提供。
theme: {
  colors: {
    // 应用品牌色，对应 bg-brand、text-brand 等工具类。
    brand: '#2563eb',
  },
  breakpoint: {
    // Wind4 使用单数 breakpoint；自定义断点时显式维护所需完整集合。
    sm: '40rem',
    md: '48rem',
    lg: '64rem',
    xl: '80rem',
    '2xl': '96rem',
  },
},
// 默认没有项目自定义规则；这里只增加一个具备明确用途的静态规则。
rules: [
  ['content-auto', { 'content-visibility': 'auto' }],
],
```

示例可以使用 `class="bg-brand text-white content-auto md:p-6"`。Wind4 的主题键与 Wind3 不完全相同，例如断点使用 `breakpoint`，不能直接照搬旧预设的 `breakpoints`。组合已有类优先用 `shortcuts`，新增 CSS 声明才使用 `rules`；动态规则和主题访问见 [Theme](https://unocss.dev/config/theme) 与 [Rules](https://unocss.dev/config/rules)。

### 属性模式与变体分组

属性模式将工具类按属性组织，变体分组减少重复前缀；两者都需要显式启用。下面是可独立使用的配置，合并到已有配置时保留原有图标选项、主题与其他转换器：

```ts [uno.config.ts（可选语法）]
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetWind4,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind4(),
    presetIcons(),
    presetAttributify({
      // 默认前缀为 un-；这里显式写出，避免与原生属性或组件 props 重名。
      prefix: 'un-',
      // 默认 false；设为 true 后仅提取带此前缀的工具属性。
      prefixedOnly: true,
    }),
  ],
  // 默认不转换括号分组；启用后展开 hover:(...) 等写法。
  transformers: [transformerVariantGroup()],
})
```

```html
<a href="/help" un-flex="~ items-center" un-gap="2" class="hover:(bg-blue-50 text-blue-700)">
  <span class="i-lucide-circle-help" aria-hidden="true"></span>
  使用帮助
</a>
```

该示例将 `un-flex="~ items-center"` 解释为 `flex items-center`，将分组展开为 `hover:bg-blue-50 hover:text-blue-700`。属性模式可能与组件 props 或属性透传产生交互，组件库接入时先验证具体组件，普通 `class` 写法不需要此预设。TSX 的属性类型和转换还有额外要求，不应直接把 Vue 示例当作 TSX 配置；参见 [Attributify](https://unocss.dev/presets/attributify) 与 [Variant Group](https://unocss.dev/transformers/variant-group)。

## 8. 接入现有检查配置

应用已使用 `@zzjtnb/eslint-config` 时，在现有首个选项对象中启用 UnoCSS 集成：

```js [eslint.config.js]
import zzjtnb from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 默认关闭；开启工具类排序及 attributify 属性检查，不负责生成 CSS。
  unocss: true,
})
```

集成所需的 ESLint 插件已由本包提供，消费项目无需重复安装。已有其他选项和后置配置应保留；更多选项见 [ESLint 按需扩展](/eslint/presets#按需扩展)。只开启此选项不会自动安装 UnoCSS、注册 Vite 插件或导入样式。

`@zzjtnb/stylelint-config` 已识别常见 UnoCSS 指令，不需要自行关闭全部未知 at-rule 检查。不过 Stylelint 允许指令并不代表 UnoCSS 已处理该指令；例如使用 `@apply` 还需要按 [Directives 官方说明](https://unocss.dev/transformers/directives)启用相应 transformer。具体检查范围见 [Stylelint 配置](/stylelint/configuration)。

## 9. 编辑器、样式覆盖与生产验证

### 编辑器提示

VS Code 可安装 [UnoCSS 官方扩展](https://unocss.dev/integrations/vscode)，在应用工作区中提供工具类补全、悬停预览等能力。先确保编辑器能定位应用的 `uno.config.ts`，Monorepo 中核对当前打开的目录和扩展日志。扩展提供提示，不会替代 Vite 插件，也不会把本地未安装的图标集合自动变成构建依赖。

### 全局样式与组件库

全局模式生成的工具类可用于 Vue 模板，包括带有 `<style scoped>` 的组件；`scoped` 不会自动隔绝全局 CSS。若工具类被覆盖，在浏览器开发者工具中查看最终命中的声明、选择器优先级、CSS 层和样式来源，再决定修改工具类或局部样式。仅调整入口导入顺序不一定能覆盖更高优先级或不同层的规则，不要用全局 `!important` 掩盖问题。

使用 UI 组件时，`class` 是否作用于预期元素取决于组件的属性透传和公开样式入口；图标按钮的尺寸、焦点与禁用行为优先使用组件本身的能力。不要为同一组件同时叠加互相冲突的 reset 或多个工具类框架。

### 在消费应用验收

在应用目录执行项目已有脚本；以下命令要求对应脚本已经配置：

```bash
# 开发时观察即时更新，检查浅色、深色、窄屏和宽屏的显示。
pnpm run dev
# 停止开发服务后，检查项目类型和既有代码规则。
pnpm run typecheck
pnpm run lint
# 构建生产产物，再使用项目的预览入口检查生成结果。
pnpm run build
pnpm run preview
```

开发与预览是持续运行的服务，需要分步执行，不要等待第一个命令自然结束。脚本名称和构建是否已经包含类型检查，以消费应用的 `package.json` 为准。

验收至少包括：静态工具类、响应式断点、深色模式、键盘焦点、禁用状态、单色图标、动态成功与失败图标、自定义图标。使用本地图标集合时，构建后可在浏览器阻止外部图标服务请求，确认图标仍正常显示。开发时正常而生产缺失时，优先核对动态拼接、扫描范围和开发与构建采用的配置是否一致。

## 10. 常见问题

| 现象 | 核对与处理 |
| --- | --- |
| 所有工具类都不生效 | 检查应用是否安装 `unocss`、注册 `UnoCSS()` 并在入口导入 `virtual:uno.css`；新增插件后重启开发服务 |
| 工具类生效但图标为空 | 检查是否启用 `presetIcons()`、安装对应集合、使用存在的图标名；查看 `warn: true` 的输出 |
| 静态图标正常，动态切换后不显示 | 检查源码是否保留完整类名，必要时为有限集合设置 `safelist` |
| 图标没有颜色或尺寸不符合预期 | 检查元素尺寸、文字颜色、覆盖样式，以及图标属于单色遮罩还是多色背景图 |
| ESLint 排序生效，页面仍无样式 | ESLint 不生成 CSS，回到 Vite 插件、UnoCSS 配置和入口导入排查 |
| `@apply` 未转换 | 检查是否启用 directives transformer，不以 Stylelint 检查通过作为转换成功的依据 |
| TypeScript 类名映射没有生成样式 | 检查 `.ts` 文件是否纳入提取范围，或将有限类名列入 `safelist` |
| `hover:(...)` 没有生效 | 检查是否注册 `transformerVariantGroup()`，普通预设不会自动展开分组 |
| 属性模式不生效 | 检查是否注册 `presetAttributify()`；开启 `prefixedOnly` 后应使用 `un-` 前缀 |
| `dark:` 不跟随系统主题 | 默认是 class 模式，核对祖先的 `dark` 类；需要跟随系统时选择 media 模式 |
| 自定义断点失效 | 核对 Wind4 的 `theme.breakpoint` 拼写及完整断点配置，不套用 Wind3 的字段 |
| 工具类已生成但效果被覆盖 | 用开发者工具检查实际元素、选择器、层和来源，不依靠 class 字符串顺序 |
| 开发正常，构建后部分图标缺失 | 检查动态类名是否静态可提取、构建扫描范围是否覆盖来源文件，以及是否使用同一份配置 |

完成配置后，在消费应用运行已有的开发、构建和检查命令，确认工具类、图标以及动态状态均符合预期；仅检查文档示例语法不能代替应用运行验证。

## 官方参考

- [UnoCSS Vite 集成](https://unocss.dev/integrations/vite)
- [Wind4 预设](https://unocss.dev/presets/wind4)
- [Icons 预设与可访问性](https://unocss.dev/presets/icons)
