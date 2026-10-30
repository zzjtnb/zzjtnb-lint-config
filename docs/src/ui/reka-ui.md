---
navigation:
  text: Reka UI
  group: ui
  order: 10
---

# Reka UI 接入与使用

Reka UI 为 Vue 提供无样式交互组件，处理控件状态、键盘导航、焦点和 ARIA 等基础行为。你负责视觉、业务状态与正确组合组件。它由 Radix Vue 演进而来；新项目使用 `reka-ui`，旧项目迁移应按官方指南逐项核对，不能只替换包名。

- [Reka UI 官方文档与演示](https://reka-ui.com/)：查询组件、示例与 API。
- [官方快速开始](https://reka-ui.com/docs/overview/getting-started)：了解安装和首次使用。
- [组件组合指南](https://reka-ui.com/docs/guides/composition)：理解 `asChild` 与已有控件组合。
- [样式指南](https://reka-ui.com/docs/guides/styling)：查询 class、状态属性与 CSS 变量。
- [无障碍说明](https://reka-ui.com/docs/overview/accessibility)：理解组件提供的能力与使用方职责。
- [Radix Vue 迁移指南](https://reka-ui.com/docs/guides/migration)：用于已有项目升级。

还未决定选型时，先阅读 [UI 组件方案对比](./)。本教程面向 Vue 3 + TypeScript 应用，使用 Composition API；Select 示例使用 Vue 3.5+ 的 `useId()`。普通 CSS 示例可直接使用；UnoCSS 是可选样式工具，不是 Reka UI 的运行前提。

## 1. 安装与导入

在实际使用组件的应用目录执行：

```bash
pnpm add reka-ui
```

这是应用运行时使用的依赖，应声明在该应用的 `dependencies` 中。pnpm Monorepo 的版本管理见[依赖版本管理](/dependencies)。本教程使用显式导入，不需要安装自动导入插件或注册全部组件；安装本包不会附带完整主题，也不要求额外安装 React 的 Radix 包。

组件按需从 `reka-ui` 导入。安装前按[官方安装说明](https://reka-ui.com/docs/overview/installation)核对当前版本的 Vue 要求；SSR、Nuxt 或自动导入场景使用对应官方指南。

## 2. 理解组件部件

Reka UI 的一个控件通常由多个有职责的部件组合，不能只放一个 Content 就期待全部行为自动成立。

| 部件 | Dialog 中的用途 | 使用注意 |
| --- | --- | --- |
| `DialogRoot` | 管理打开状态并为其他部件提供上下文 | Trigger 与内容放在同一 Root 下 |
| `DialogTrigger` | 打开弹窗的触发按钮 | 默认渲染按钮，复用现有按钮时用 `as-child` |
| `DialogPortal` | 将弹层传送到外部挂载位置 | 默认进入 body；祖先局部样式和主题作用范围需考虑挂载位置 |
| `DialogOverlay` | 覆盖背景的遮罩层 | 视觉样式由应用设置 |
| `DialogContent` | 弹窗内容及焦点、交互处理 | 不重复实现另一套焦点陷阱或 Escape 监听 |
| `DialogTitle` / `DialogDescription` | 为弹窗建立标题和描述关联 | 使用有意义的可见文字，不随意删除 |
| `DialogClose` | 关闭按钮 | 默认按钮，可组合应用自己的按钮 |

Root、Trigger、Content 等名字在其他控件中也会出现，但 props、事件和键盘行为由具体组件定义。例如 Select 的模型值不叫 `open`，不能将弹窗配置机械套到选择框。

## 3. 一个完整 Dialog

在应用中新建组件并从页面引入。示例只维护弹窗打开状态，不涉及网络请求；按钮均明确为 `type="button"`，避免在表单内部意外提交。

```vue [src/components/HelpDialog.vue]
<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'reka-ui'

const open = ref(false)
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child>
      <button type="button">查看使用帮助</button>
    </DialogTrigger>
    <DialogPortal>
      <DialogOverlay class="help-overlay" />
      <DialogContent class="help-dialog">
        <DialogTitle>使用帮助</DialogTitle>
        <DialogDescription>
          先选择配置，再运行检查；检查失败时根据诊断修改对应文件。
        </DialogDescription>
        <DialogClose as-child>
          <button type="button">我知道了</button>
        </DialogClose>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style>
.help-overlay {
  position: fixed;
  z-index: 40;
  inset: 0;
  background: rgb(0 0 0 / 45%);
}

.help-dialog {
  position: fixed;
  z-index: 41;
  top: 50%;
  left: 50%;
  box-sizing: border-box;
  width: min(28rem, calc(100vw - 2rem));
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
  padding: 1.5rem;
  border-radius: 0.75rem;
  background: white;
  color: #0f172a;
  transform: translate(-50%, -50%);
}
</style>
```

`DialogRoot` 的 `open` 通过 `v-model:open` 与 `ref` 双向绑定；默认 `modal` 为 `true`，由组件处理模态弹窗的背景交互与焦点。不要额外把每次点击遮罩、Escape 和焦点变化都手动映射为 `open = false`；先使用官方默认行为。

`DialogPortal` 改变实际 DOM 位置，依赖页面祖先选择器的样式或只放在页面容器上的主题变量，可能无法覆盖进入 body 的内容。示例用带用途前缀的全局类避免依赖祖先结构；使用 scoped 样式时应按官方样式指南核对部件和深度选择器，并检查实际 DOM 的匹配结果。应用级主题变量通常放在 `:root` 或能覆盖 Portal 的主题容器；特殊挂载需求按 Portal 的 `to` 属性配置。

示例提供浅色基础外观，深色主题应使用应用的颜色变量或下面的 UnoCSS 方式，并保留可见焦点样式。`z-index` 数值是示例约定，不代表能覆盖应用全部弹层；与现有弹层层级统一维护。

## 4. 受控状态与默认值

| 需求 | Dialog 写法 | 含义 |
| --- | --- | --- |
| 由控件自行管理开关 | `<DialogRoot>` | 默认关闭，交互改变内部状态 |
| 仅设置初始打开 | `<DialogRoot :default-open="true">` | 初始值，不用于后续同步业务状态 |
| 页面要读取或修改开关 | `<DialogRoot v-model:open="open">` | 页面持有当前值，并接收 `update:open` |

不要同时维护一个本地开关、一个 props 开关，再用多个 watch 互相同步。业务对象决定弹窗何时打开时，以同一个受控值驱动 Root；只需要默认行为时无需额外创建状态。

异步提交应由业务操作管理：执行期间反映真实 pending 状态、失败保留内容并显示原因、成功后再关闭。`DialogClose` 适合直接关闭的动作，不应包住一个“无论保存成功与否都会关闭”的异步提交按钮。危险操作需要明确确认流程时，评估 [Alert Dialog](https://reka-ui.com/docs/components/alert-dialog)，而不是只给普通 Dialog 换个标题。

## 5. `as-child` 与现有按钮组合

`DialogTrigger` 默认渲染按钮，直接在里面再放一个按钮会产生嵌套按钮。`as-child` 将交互属性和行为合并到插槽中的子元素，前文因此使用真实的 `<button>`。

组合自有 Button 组件时，子组件必须把收到的属性、事件和必要的引用正确交给实际可交互元素；多根节点、关闭属性继承或自行截断事件，都可能破坏组合。先使用原生按钮验证，再接入项目组件，详见[官方组合指南](https://reka-ui.com/docs/guides/composition)。

不要为了方便把 Trigger 改成无法键盘操作的 `<div>`。跳转行为使用链接，打开弹窗等操作使用按钮；`as-child` 不会替使用方纠正错误的 HTML 语义。

## 6. 使用 UnoCSS 与图标

先完成 [UnoCSS 与图标](/ui/unocss) 的安装与入口配置。Reka UI 不要求 Tailwind，普通 UnoCSS 类名可直接作用于它渲染的元素，例如将前文 Content 的 class 改成：

```html
<DialogContent class="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md overflow-y-auto rounded-xl bg-white p-6 text-slate-900 -translate-x-1/2 -translate-y-1/2 dark:bg-slate-900 dark:text-slate-100">
  <!-- 放置前文完整的标题、描述和关闭按钮。 -->
</DialogContent>
```

这段是 Content 样式替换片段，不是独立弹窗；保留 Root、Portal、Overlay 和全部语义部件。采用此方案时移除原 Content 的 `.help-dialog` 类，避免两套定位和颜色同时控制同一元素。遮罩仍需应用自己的布局样式。

图标关闭按钮可以放在 `DialogClose as-child` 中：

```html
<button type="button" aria-label="关闭使用帮助">
  <span class="i-lucide-x" aria-hidden="true"></span>
</button>
```

仅有图标时，按钮的 `aria-label` 提供名称，图标隐藏于辅助技术；有可见关闭文字时直接使用该文字。不要用 CSS 图标代替整个按钮。

Reka UI 还会输出组件特有的 `data-state`、`data-disabled` 等状态属性，可用普通 CSS 编写状态外观。例如 Select 触发器的 `data-state` 可表示 `open` / `closed`；具体可用属性以对应组件文档为准，不能假设所有控件状态名都一样。

## 7. 一个带标签的 Select

原生 `<select>` 已满足需求时可以直接使用原生控件。需要自定义弹出列表与组合结构时，下面示例展示 Reka UI 的受控选择框：

```vue [src/components/ConfigSelect.vue]
<script setup lang="ts">
import { ref, useId } from 'vue'
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'

const selected = ref('eslint')
const labelId = useId()
const options = [
  { value: 'eslint', label: 'ESLint' },
  { value: 'stylelint', label: 'Stylelint' },
  { value: 'markdownlint', label: 'Markdownlint' },
]
</script>

<template>
  <SelectRoot v-model="selected">
    <span :id="labelId">检查配置</span>
    <SelectTrigger :aria-labelledby="labelId">
      <SelectValue placeholder="选择配置" />
    </SelectTrigger>
    <SelectPortal>
      <SelectContent position="popper" class="config-options">
        <SelectViewport>
          <SelectItem v-for="option in options" :key="option.value" :value="option.value" class="config-option">
            <SelectItemText>{{ option.label }}</SelectItemText>
            <SelectItemIndicator aria-hidden="true">✓</SelectItemIndicator>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>

<style>
.config-options {
  z-index: 50;
  min-width: var(--reka-select-trigger-width);
  max-height: var(--reka-select-content-available-height);
  overflow-y: auto;
  padding: 0.25rem;
  border: 1px solid #cbd5e1;
  border-radius: 0.5rem;
  background: white;
  color: #0f172a;
}

.config-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
}

.config-option[data-highlighted] {
  background: #dbeafe;
  color: #1e3a8a;
}
</style>
```

`SelectRoot` 使用默认 `v-model` 管理选中值；`SelectValue` 负责显示所选项，`SelectItemText` 提供对应文字，Indicator 展示选中状态。不要再用 click 处理器重复维护选中值或手写方向键导航。

`position="popper"` 显式采用基于触发器的弹层定位；示例宽度和可用高度使用该模式提供的 CSS 变量。`useId()` 为每个实例生成唯一标签 ID；旧版 Vue 应通过组件参数传入各自唯一的 ID，并核对 SSR 一致性。完整表单、禁用、分组、滚动与键盘规则见 [Select 官方文档](https://reka-ui.com/docs/components/select)。

## 8. SSR、动画与项目封装

- **SSR 与 Nuxt**：Reka UI 支持服务端渲染，但 ID、Teleport 和挂载时机仍应按应用 Vue 版本及[官方 SSR 指南](https://reka-ui.com/docs/guides/server-side-rendering)处理。不要为绕过所有问题而给整页套仅客户端渲染；先定位具体不一致。
- **动画**：使用组件公开的状态属性、CSS 动画或 Vue Transition，并核对挂载和卸载行为。`forceMount` 用于确实需要自行管理挂载的情形，不是消除闪烁的通用开关。见[动画指南](https://reka-ui.com/docs/guides/animation)。
- **封装**：重复使用且有统一设计的 Dialog、Select 可封装为应用控件，对外保留实际需要的 props、事件、插槽与模型值。传递 Reka props 和 emits 时优先复用官方类型与[转发工具](https://reka-ui.com/docs/utilities/use-forward-props-emits)，不要手写一套逐渐失配的同义类型。
- **国际化与方向**：应用统一维护文案和方向，需要 RTL 时使用官方 ConfigProvider 等公开入口；日期控件还应单独核对日期类型、语言与时区，不把字符串直接当作任意日期值。见[国际化指南](https://reka-ui.com/docs/guides/i18n)。

## 9. 常见问题与验收

| 现象 | 优先核对 |
| --- | --- |
| 安装后控件没有完整外观 | Reka UI 无预设主题，检查是否提供了组件样式或 UnoCSS 工具类 |
| 点击按钮提交了外层表单 | 应用按钮是否明确使用 `type="button"`，是否出现嵌套按钮 |
| `as-child` 后键盘或点击失效 | 子组件是否透传属性、事件及必要引用，实际根元素是否可以交互 |
| 弹层被裁剪、颜色或层级异常 | Portal 的实际挂载位置、祖先选择器、主题变量作用域和应用弹层层级 |
| 父页面改变开关但弹窗不更新 | 是否把初始 `default-open` 当成受控 `open`，模型值是否只有一个来源 |
| 关闭后焦点位置异常 | Trigger 是否仍存在，是否自行阻止了自动聚焦事件，是否混入另一套焦点逻辑 |
| 选择框无法识别标签或选中文字 | Trigger 的标签关联、ItemText、模型值和 Item value 是否完整正确 |
| 深色模式下弹层仍是浅色 | Portal 所在位置能否继承主题，以及示例浅色 CSS 是否已替换为项目主题样式 |

在消费应用执行已有类型检查、代码检查和构建，再验证实际页面；本页示例解析通过不代表真实交互已经验收。至少覆盖：

1. 使用鼠标、触屏和键盘打开控件，确认触发器有清晰名称与可见焦点。
2. Dialog 打开后，Tab 与 Shift+Tab 在模态区域内移动；Escape 关闭后焦点回到触发器。
3. Select 使用方向键移动、确认选择与 Escape 退出，读屏能够识别标签和当前值。
4. 长内容、窄屏、深色模式、嵌套表单和多个实例的标签关联正确。
5. 业务提交失败不假装成功，重复操作、禁用和关闭行为与真实状态一致。

需要进一步扩展时，从官方 [Dialog](https://reka-ui.com/docs/components/dialog)、[Select](https://reka-ui.com/docs/components/select)、[Combobox](https://reka-ui.com/docs/components/combobox)、[Tooltip](https://reka-ui.com/docs/components/tooltip) 文档进入。选择框、可搜索组合框和菜单属于不同控件，应按用户任务选择，不通过外观相似就互相替代。
