---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 本项目预设
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: stylelint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 20
---

# Stylelint 本项目预设

本页只说明本项目维护的默认差异。上游完整规则、默认选项和推荐配置继续由[上游](/stylelint/upstream)维护，消费项目只声明需要改变的部分，不重复复制它们。

未覆盖的配置保持继承，消费方同名规则有最终覆盖入口，见[详细配置](/stylelint/configuration)。

## 文件语法作用域

本包通过 `overrides` 为不同文件扩展名选择 parser 和 preset：

解析器由共享包直接加载并以实例传给 Stylelint，消费项目无需额外安装 `postcss-html` 或 `postcss-scss`；本地 `link:` 和正式安装使用相同配置入口。

| 文件 | `customSyntax` | 追加配置 | 结果 |
| --- | --- | --- | --- |
| `*.css` | Stylelint 默认 CSS 语法 | 无 | CSS 规则和属性顺序 |
| `*.scss` | `postcss-scss` | SCSS preset | CSS、SCSS 和 `scss/*` 规则 |
| `*.vue` | `postcss-html` | Vue SCSS preset | SFC 中的 CSS、SCSS 和 Vue 容器 |
| `*.html`、`*.htm` | `postcss-html` | 无 | HTML 容器中的 CSS |

顶层 `rules` 优先于文件 override 内继承的 preset。仅适用于 CSS / HTML 的规则在对应文件作用域声明，不在顶层重新开启 SCSS 预设已关闭的规则。工厂参数中的 `rules` 会在共享文件级默认值之后应用，再应用同一参数的 `overrides`；后续配置片段继续按此顺序覆盖。

SCSS plugin 规则只在 `.scss` 和 `.vue` override 中注册。普通 CSS 不会因为全局配置引用 `scss/*` 而收到 `Unknown rule`。

Stylelint CLI 仍然按扩展名匹配配置 override；不要把所有文件交给 `stylelint .`。

## languageOptions

共享语言模型为工具类 CSS 框架注册额外指令，并将 `rpx` 注册为长度单位。下面只是结构节选，不是可直接替换完整默认值的配置；完整定义见[本包语法配置源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint/src/configs/syntax.ts)：

```ts
export const languageOptions = {
  // 扩展 Stylelint 可识别的语言语法；由 languageOptions 或工厂的同名入口承载。
  syntax: {
    // 声明 @atRules 指令为项目语法，避免按未知 at-rule 处理。
    atRules: {
      // 声明 @config 指令为项目语法，避免按未知 at-rule 处理。
      config: {
        // 为这条自定义语法提供说明，不作为实际 CSS 输入。
        comment: 'Utility-first framework directive' },
      // 声明 @custom-variant 指令为项目语法，避免按未知 at-rule 处理。
      'custom-variant': {
        // 为这条自定义语法提供说明，不作为实际 CSS 输入。
        comment: 'Utility-first framework directive' },
      // 声明 @theme 指令为项目语法，避免按未知 at-rule 处理。
      theme: {
        // 为这条自定义语法提供说明，不作为实际 CSS 输入。
        comment: 'Utility-first framework directive' },
      // 声明 @unocss 指令为项目语法，避免按未知 at-rule 处理。
      unocss: {
        // 为这条自定义语法提供说明，不作为实际 CSS 输入。
        comment: 'Utility-first framework directive' },
    },
    // 按单位维度声明额外合法单位，供相关语法检查使用。
    units: {
      // 将列表中的单位识别为长度单位，避免合法的项目单位被误报。
      length: ['rpx'],
    },
  },
}
```

共享语法模型注册的工具类 at-rule 包括：

```text
@config
@container-queries
@custom-variant
@extends
@ignores
@plugin
@reference
@responsive
@screen
@source
@tailwind
@theme
@uno
@unocss
@unocss-apply
@unocss-variants
@utilities
@utility
@variant
@variants
```

列表只包含 Stylelint 与 SCSS 插件原生不识别的工具类指令；Sass 内置指令由 SCSS 预设和插件识别，Stylelint 已原生识别的 at-rule 也不重复注册。SCSS preset 不读取 Stylelint 17 的 `languageOptions.syntax.atRules`，因此 SCSS 规则会复用同一份工具类指令列表，避免 CSS 与 SCSS 的例外漂移。

## 本包的规则覆盖

逐项展示上游默认值、本包配置和输入代码触发的诊断。每例先对照“只检查”与“自动修复”的行为，再展示输入和正确写法。正确写法明确标注自动修复结果或手动修正；关闭规则可能允许原输入，并不意味着工具会将它改成正确写法。示例聚焦当前规则，不代表完整预设的全部检查结果。error / warn 是诊断级别，与能否修复无关。支持自动修复的已启用规则在执行修复命令时应用；规则关闭、输入无诊断、不提供自动修复是三种不同情况。编辑器的修正建议需要手动确认，不属于自动修复。

Stylelint 上游对照使用相同的官方 preset 和 parser，不叠加本包语法扩展与规则差异。

null 表示关闭该规则；开启时按规则要求使用 true 或字符串选项。at-rule-no-unknown 的对照用于说明语言模型适配，默认规则本身仍跟随预设。

### 语法与框架指令

#### `at-rule-prelude-no-invalid` {#rule-at-rule-prelude-no-invalid}

本包：`true`，忽略 `@apply` 参数；上游默认：`true`，忽略 `@media` 参数。

工具类的 @apply 参数按框架语法保留；其他 at-rule 参数仍由各自规则检查。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // at-rule 参数语法检查；当前启用，按以下主选项和例外执行。
  "at-rule-prelude-no-invalid": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true,
    // 次级选项，补充语法例外和报告方式。
    {
      // 对列出的 at-rule 名称应用当前规则的例外。
      "ignoreAtRules": [
        "apply"
      ]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // at-rule 参数语法检查；当前启用，按以下主选项和例外执行。
  "at-rule-prelude-no-invalid": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true,
    // 次级选项，补充语法例外和报告方式。
    {
      // 对列出的 at-rule 名称应用当前规则的例外。
      "ignoreAtRules": [
        "media"
      ]
    }
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 此输入无诊断，无需修复 |
| 上游 | error：该 at-rule 的参数不符合当前语法要求（at-rule-prelude-no-invalid）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```css [utilities.css（输入代码）]
.card {
  @apply px-4 rounded-lg;
}
```

```css [utilities.css（正确写法：手动修正）]
.card {
  padding-inline: 1rem;
  border-radius: 0.5rem;
}
```

:::

### 选择器与命名

#### `selector-pseudo-class-no-unknown` {#rule-selector-pseudo-class-no-unknown}

本包：`true（选项见代码）`；上游默认：`true`。

允许 deep、global、slotted；例外名单之外的未知伪类仍会被报告。框架语法在本包下可保留；下方原生 CSS 示例只是另一种合法选择器写法，不是 Vue 样式作用域的等价转换。使用框架语法时应配置对应预设或例外名单，不应直接删掉作用域标记。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 未知伪类检查；当前启用，按以下主选项和例外执行。
  "selector-pseudo-class-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true,
    // 次级选项，补充语法例外和报告方式。
    {
      // 允许这些框架扩展伪类，其他未知伪类仍检查。
      "ignorePseudoClasses": [
        "deep",
        "global",
        "slotted"
      ]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 未知伪类检查；当前启用，按以下主选项和例外执行。
  "selector-pseudo-class-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 此输入无诊断，无需修复 |
| 上游 | error：此伪类不在当前规则允许的名称中（selector-pseudo-class-no-unknown）。；error：此伪类不在当前规则允许的名称中（selector-pseudo-class-no-unknown）。；error：此伪类不在当前规则允许的名称中（selector-pseudo-class-no-unknown）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```css [scoped.css（输入代码）]
.card :deep(.child),
:global(.shared),
:slotted(span) {
  color: red;
}
```

```css [scoped.css（正确写法：原生 CSS 替代示例）]
.card .child,
.shared,
span {
  color: red;
}
```

:::

补充输入：检查仍会报告的情况。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | error：此伪类不在当前规则允许的名称中（selector-pseudo-class-no-unknown）。 | 不提供自动修复，需手动修改 |
| 上游 | error：此伪类不在当前规则允许的名称中（selector-pseudo-class-no-unknown）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```css [scoped.css（输入代码）]
.card:made-up { color: red; }
```

```css [scoped.css（正确写法：手动修正）]
.card:hover { color: red; }
```

:::

#### `selector-pseudo-element-no-unknown` {#rule-selector-pseudo-element-no-unknown}

本包：`true（选项见代码）`；上游默认：`true`。

兼容已有的 v-deep、v-global、v-slotted 伪元素写法，其他未知伪元素仍检查。框架项目在本包下可保留原输入；下方原生 CSS 只是另一种合法实现，不等价于框架的作用域转换。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 未知伪元素检查；当前启用，按以下主选项和例外执行。
  "selector-pseudo-element-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true,
    // 次级选项，补充语法例外和报告方式。
    {
      // 允许这些框架扩展伪元素，其他未知伪元素仍检查。
      "ignorePseudoElements": [
        "v-deep",
        "v-global",
        "v-slotted"
      ]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 未知伪元素检查；当前启用，按以下主选项和例外执行。
  "selector-pseudo-element-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 此输入无诊断，无需修复 |
| 上游 | error：此伪元素不在当前规则允许的名称中（selector-pseudo-element-no-unknown）。；error：此伪元素不在当前规则允许的名称中（selector-pseudo-element-no-unknown）。；error：此伪元素不在当前规则允许的名称中（selector-pseudo-element-no-unknown）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```css [scoped.css（输入代码）]
.card ::v-deep .child,
::v-global(.shared),
::v-slotted(span) {
  color: red;
}
```

```css [scoped.css（正确写法：原生 CSS 替代示例）]
.card .child,
.shared,
span {
  color: red;
}
```

:::

补充输入：检查仍会报告的情况。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | error：此伪元素不在当前规则允许的名称中（selector-pseudo-element-no-unknown）。 | 不提供自动修复，需手动修改 |
| 上游 | error：此伪元素不在当前规则允许的名称中（selector-pseudo-element-no-unknown）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```css [scoped.css（输入代码）]
.card::made-up { color: red; }
```

```css [scoped.css（正确写法：手动修正）]
.card::before { content: ""; color: red; }
```

:::

### 源码与声明组织

#### `no-empty-source` {#rule-no-empty-source}

本包：`未启用`；上游默认：`true`。

允许内容为空白的占位样式文件。下面的文件没有实际内容；消费方设为 true 时应报告 no-empty-source。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 当前规则无诊断 | 此输入无诊断，无需修复 |
| 上游 | 当前规则无诊断 | 此输入无诊断，无需修复 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```text [empty.css（输入代码）]
（文件内容为空白）
```

```css [empty.css（正确写法：手动修正）]
.card { color: red; }
```

:::

#### `order/order` {#rule-order-order}

本包：`自定义顺序（选项见代码）`；上游默认：`未启用`。

自定义属性放在普通声明之前；属性之间的排序仍由 recess-order 预设维护。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 块内节点排序；当前启用，按以下主选项和例外执行。
  "order/order": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    [
      // SCSS 变量声明。
      "dollar-variables",
      // CSS 自定义属性声明。
      "custom-properties",
      // 普通 at-rule 节点。
      "at-rules",
      // 普通属性声明。
      "declarations",
      {
        // 匹配指定名称的语法节点，例如 supports 对应 @supports。
        "name": "supports",
        // 指定排序条目的节点类型；at-rule 表示样式指令节点。
        "type": "at-rule"
      },
      {
        // 匹配指定名称的语法节点，例如 supports 对应 @supports。
        "name": "media",
        // 指定排序条目的节点类型；at-rule 表示样式指令节点。
        "type": "at-rule"
      },
      {
        // 匹配指定名称的语法节点，例如 supports 对应 @supports。
        "name": "include",
        // 指定排序条目的节点类型；at-rule 表示样式指令节点。
        "type": "at-rule"
      },
      // 嵌套规则块。
      "rules"
    ],
    // 次级选项，补充语法例外和报告方式。
    {
      // 报告级别；error 影响失败状态，warning 仅作为警告。
      "severity": "error"
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 块内节点排序；当前关闭，不执行它的检查或自动修复。
  "order/order": null
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |
| 上游 | order/order 未启用，原样保留这段写法。 | 规则已关闭，不执行修复；该规则本身支持自动修复 |

下方给出启用该规则时的修复结果；关闭规则的一方不会执行这项修复。

::: code-group

```css [order.css（输入代码）]
.card {
  color: red;
  --gap: 4px;
}
```

```css [order.css（正确写法：自动修复结果）]
.card {
  --gap: 4px;
  color: red;
}
```

:::

### SCSS 专属规则

#### `scss/at-rule-no-unknown` {#rule-scss-at-rule-no-unknown}

本包：`true（选项见代码）`；上游默认：`true`。

在 SCSS/Vue 中识别共享的工具类指令例外，不把 Sass 和框架的指令交给普通 CSS 规则统一判断。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // SCSS 未知指令检查；当前启用，按以下主选项和例外执行。
  "scss/at-rule-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true,
    // 次级选项，补充语法例外和报告方式。
    {
      // 对列出的 at-rule 名称应用当前规则的例外。
      "ignoreAtRules": [
        "config",
        "container-queries",
        "custom-variant",
        "extends",
        "ignores",
        "plugin",
        "reference",
        "responsive",
        "screen",
        "source",
        "tailwind",
        "theme",
        "uno",
        "unocss",
        "unocss-apply",
        "unocss-variants",
        "utilities",
        "utility",
        "variant",
        "variants"
      ]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // SCSS 未知指令检查；当前启用，按以下主选项和例外执行。
  "scss/at-rule-no-unknown": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    true
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 此输入无诊断，无需修复 |
| 上游 | error：此框架指令不在当前 SCSS 例外名单中（scss/at-rule-no-unknown）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```scss [utilities.scss（输入代码）]
@theme {
  --color-primary: #1765d1;
}
```

```scss [utilities.scss（正确写法：手动修正）]
.theme {
  --color-primary: #1765d1;
}
```

:::

#### `at-rule-empty-line-before` {#rule-at-rule-empty-line-before}

本包：`always（选项见代码）`；上游默认：`always（选项见代码）`。

保持 Sass 条件分支的排版紧凑，不强制在 @else 前插入空行。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 指令前空行检查；当前启用，按以下主选项和例外执行。
  "at-rule-empty-line-before": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    "always",
    // 次级选项，补充语法例外和报告方式。
    {
      // 列出的语法位置采用当前规则的例外形式。
      "except": [
        "blockless-after-same-name-blockless",
        "first-nested"
      ],
      // 跳过这些场景的当前规则检查。
      "ignore": [
        "after-comment"
      ],
      // 对列出的 at-rule 名称应用当前规则的例外。
      "ignoreAtRules": [
        "else"
      ]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 指令前空行检查；当前启用，按以下主选项和例外执行。
  "at-rule-empty-line-before": [
    // 当前规则的主选项；可为开关、样式或排序列表。
    "always",
    // 次级选项，补充语法例外和报告方式。
    {
      // 列出的语法位置采用当前规则的例外形式。
      "except": [
        "blockless-after-same-name-blockless",
        "first-nested"
      ],
      // 跳过这些场景的当前规则检查。
      "ignore": [
        "after-comment"
      ]
    }
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 此输入无诊断，无需修复 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；关闭规则的一方不会执行这项修复。

::: code-group

```scss [branch.scss（输入代码）]
.card {
  @if $active { color: red; } @else { color: blue; }
}
```

```scss [branch.scss（正确写法：自动修复结果）]
.card {
  @if $active { color: red; }

 @else { color: blue; }
}
```

:::

## 消费方如何调整规则

需要修改时只覆盖目标规则：

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
  rules: {
    // 按配置的正则限制类选择器命名；不会影响其他选择器类型。
    'selector-class-pattern': null,
    // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
    'no-empty-source': true,
  },
})
```

Stylelint 的规则主选项取决于具体规则；例如 `no-empty-source` 使用 `true` 启用，而不是 ESLint 风格的 `'error'`。如需显式指定级别，使用 `[true, { severity: 'error' }]`。

## 执行与报告

以下分别标明共享策略与 Stylelint 原生执行默认值；cache 和 fix 不在共享对象中重复声明。

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `allowEmptyInput` | `true` | glob 没有匹配文件时不让运行失败 |
| `cache` | `false`（原生） | 不自动使用缓存 |
| `fix` | `false`（原生） | 不自动写回修复结果 |
| `reportDescriptionlessDisables` | `true` + warning | 没有描述的 disable 注释报告 warning |
| `reportInvalidScopeDisables` | `true` + warning | 规则作用域无效时报告 warning |
| `reportNeedlessDisables` | `true` + warning | 已不需要的 disable 注释报告 warning |
| `reportUnscopedDisables` | `true` + warning | 未指定规则的 disable 注释报告 warning |

覆盖报告级别：

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 报告没有必要的 Stylelint 禁用注释，可通过 severity 配置诊断级别。
  reportNeedlessDisables: [true, {
    // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
    severity: 'error' }],
})
```

缓存和修复应由消费项目显式决定：

```bash
# 检查指定样式文件，按实际配置解析 CSS、SCSS 或 Vue。
pnpm exec stylelint "**/*.{css,scss,vue,html}" \
  --config stylelint.config.js \
  --cache \
  --cache-location node_modules/.cache/.stylelintcache

# 检查指定样式文件，按实际配置解析 CSS、SCSS 或 Vue。
pnpm exec stylelint "**/*.{css,scss,vue,html}" \
  --config stylelint.config.js \
  --fix
```

## 默认忽略

Stylelint 原生默认排除 node_modules，官方预设没有为本例额外提供 ignoreFiles。本包只追加生成物和非样式资源，不重复声明原生排除。以下使用相对 glob 展示对照，实际共享 ignoreFiles 会按调用时的业务项目工作目录转换为绝对路径。

::: code-group

```jsonc [本包默认（含原生）]
[
  // 依赖安装目录，由包管理器维护。
  "**/node_modules/**",
  // 构建输出或发布制品。
  "**/dist/**",
  // 构建输出或发布制品。
  "**/build/**",
  // 备份副本，不作为当前源码检查。
  "**/backup/**",
  // 代码分析工具生成的索引。
  "**/.codegraph/**",
  // 各层级临时验证与工具材料默认不检查。
  "**/.tmp/**",
  // Git 元数据与工具缓存。
  "**/.git/**",
  "**/.cache/**",
  // 框架服务端构建输出。
  "**/.output/**",
  // 原生工程及其生成内容，由对应工具链管理。
  "**/src-tauri/**",
  // 构建输出或发布制品。
  "**/releases/**",
  // 框架生成内容或开发缓存。
  "**/.nuxt/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.turbo/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vercel/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.wrangler/**",
  // 测试覆盖率产物。
  "**/coverage/**",
  // Playwright 生成的测试报告，不作为样式源码。
  "**/playwright-report/**",
  // Playwright 测试结果与附件。
  "**/test-results/**",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.js",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.jsx",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.tsx",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.ts",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.json",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.md"
]
```

```jsonc [上游 Stylelint 默认]
[
  // 依赖安装目录，由包管理器维护。
  "**/node_modules/**"
]
```

```jsonc [本包追加]
[
  // 构建输出或发布制品。
  "**/dist/**",
  // 构建输出或发布制品。
  "**/build/**",
  // 备份副本，不作为当前源码检查。
  "**/backup/**",
  // 代码分析工具生成的索引。
  "**/.codegraph/**",
  // 各层级临时验证与工具材料默认不检查。
  "**/.tmp/**",
  // Git 元数据与工具缓存。
  "**/.git/**",
  "**/.cache/**",
  // 框架服务端构建输出。
  "**/.output/**",
  // 原生工程及其生成内容，由对应工具链管理。
  "**/src-tauri/**",
  // 构建输出或发布制品。
  "**/releases/**",
  // 框架生成内容或开发缓存。
  "**/.nuxt/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.turbo/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vercel/**",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.wrangler/**",
  // 测试覆盖率产物。
  "**/coverage/**",
  // Playwright 生成的测试报告，不作为样式源码。
  "**/playwright-report/**",
  // Playwright 测试结果与附件。
  "**/test-results/**",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.js",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.jsx",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.tsx",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.ts",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.json",
  // 非样式文件，由 ESLint、TypeScript 或 Markdownlint 负责。
  "**/*.md"
]
```

```js [stylelint.config.js（消费方追加）]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 追加业务生成目录；空数组不会清除本包默认忽略。
  ignoreFiles: ['**/generated/**', '**/public/assets/**'],
})
```

:::

工厂每次调用按当前工作目录生成共享路径，原生 extends 的默认对象则在模块加载时生成。工厂的 ignoreFiles 参数只追加模式；确需接管共享列表时，可以覆盖工厂返回对象的同名字段。这样不会自动移除 Stylelint 自身的默认过滤。
