---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 本项目预设
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: eslint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 20
---

# ESLint 本项目预设

配置示例默认使用 ESM JavaScript，加载条件见[快速开始](/eslint#使用默认预设)。

本页只说明本项目维护的默认差异。上游完整规则、默认选项和推荐配置继续由[上游](/eslint/upstream)维护，消费项目只声明需要改变的部分，不重复复制它们。

未覆盖的配置保持继承，消费方同名规则有最终覆盖入口，见[详细配置](/eslint/configuration)。

## 默认集成

本包默认向 antfu 传递或启用以下能力：

- `typescript: true`；
- Vue 集成及 `vue.a11y` 默认开启；
- `antislop: true`，通用文本检查限于 JS、TS 和 Vue 源码，不接管独立文档与样式的解析；
- `pnpm`，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用（antfu 的默认行为）；
- antfu 当前版本提供的 JavaScript、JSON、JSONC、YAML、TOML、Markdown、Node.js、perfectionist 和 stylistic 集成。

扩展集成的依赖归属、默认状态和开启方式统一见[按需扩展](#按需扩展)。

### TypeScript

TypeScript parser 和 TypeScript 规则由 antfu 负责注册。本包不会重新声明 parser，也不会把上游的类型选项改名。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 TypeScript 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  typescript: true,
})
```

### Vue

Vue 与无障碍检查默认开启，Vue 规则及其参数全部沿用 antfu 预设，本包不重复声明。

关闭 Vue：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 Vue 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  vue: false,
})
```

关闭后，antfu 不启用 Vue parser、插件和本包提供的 Vue 默认规则。

### pnpm workspace

pnpm 配置由 antfu 负责解析、排序和字段类型。不设置 `pnpm` 时，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 才启用该集成，npm 和 yarn 项目无需任何设置；`pnpm: true` 会强制启用，并要求存在该文件。集成启用时，本包在 workspace 范围调整策略检查和重复版本判断：仅从 `pnpm/yaml-enforce-settings` 的 settings 中移除 trustPolicy，其他上游设置保持不变。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 pnpm 工作区的 JSON、YAML 与排序集成；false 关闭，对象仅覆盖明确列出的能力。
  pnpm: false,
})
```

`pnpm: false` 会关闭 antfu 的 pnpm 集成，也不会追加本包的 pnpm 覆盖。对象形式的可用字段以当前安装的 antfu 版本为准：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 pnpm 工作区的 JSON、YAML 与排序集成；false 关闭，对象仅覆盖明确列出的能力。
  pnpm: {
    // 配置上游 JSON 格式化器，不改变当前项目 JSONC 的继承来源。
    json: true,
    // 配置 YAML 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
    yaml: true,
    // 仅调整当前格式组的排序约定，使用示例中明确给出的规则值。
    sort: true,
  },
})
```

YAML 是否启用遵循 antfu 的组装顺序：顶层 `yaml: false` 会关闭普通 YAML，并作为 pnpm YAML 的默认值；`pnpm.yaml` 的显式值优先。两处都关闭时，本包不追加匹配工作区 YAML 的规则片段。

测试集成的默认差异与 pnpm 版本判断示例见[对应规则](#rule-test-no-import-node-test)，消费方仍可通过正式入口覆盖。

## 按需扩展

本节包含按需开启的能力，以及可以按项目调整的默认集成。以下插件依赖均由本包提供，不需要消费方重复安装。安装插件不等于开启全部规则；除 shadcn 由本包注册外，其余集成都通过 antfu 的正式入口组装。

| 能力 | 用途与适用场景 | 默认状态 | 调整入口 |
| --- | --- | --- | --- |
| UnoCSS | 使用 UnoCSS 的项目检查并排序工具类、处理 attributify 属性；不负责生成 CSS | 关闭 | `unocss: true` 开启，`false` 关闭 |
| Vue 无障碍 | 静态检查图片替代文本、表单标签关联、交互元素及 ARIA 等问题；不能代替键盘、读屏与对比度实测 | Vue 启用时开启 | `vue: { a11y: false }` 只关闭无障碍；`vue: false` 关闭整个 Vue 集成 |
| 外部 formatter | 通过 ESLint 调用格式化器，适合 HTML 等交给 ESLint 统一修复的文件；不用于替代语义检查 | 关闭 | `formatters: { html: true }` 等逐项开启，避免和其他工具重复修复同类文件 |
| antislop | 使用上游选定的 slop、SonarJS 规则检查冗余抽象、连续类型断言、注释与文案问题、重复逻辑和认知复杂度；不是识别代码作者的工具 | 开启 | `antislop: false` 关闭；对象可选择 slop、sonarjs 子集和复杂度阈值 |
| shadcn | 为 Tailwind v4 设计系统检查组件样式契约、允许的类名与变体，避免消费方随意覆盖组件设计；不要求使用 shadcn/ui | 只注册插件，不开启规则 | 按项目设计系统配置 `shadcn/*` 规则及其参数；普通 UnoCSS 项目不必开启 |

依赖分别是 `@unocss/eslint-plugin`、`eslint-plugin-vuejs-accessibility`、`eslint-plugin-format`、`eslint-plugin-slop` / `eslint-plugin-sonarjs` 和 `@shadcn/lint`。每条规则能否自动修复取决于其实现，启用整个集成不代表所有问题都能自动修改。

UnoCSS 的 Vite 插件、样式入口与 Lucide 图标接入见 [UnoCSS 与图标](/ui/unocss)。本节只说明 ESLint 检查选项。

例如 UnoCSS 项目同时使用 Stylelint、Markdownlint 时，只追加 UnoCSS 和 HTML formatter；默认已开启的 Vue 无障碍、antislop 无需重复声明：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 启用 UnoCSS 类名排序与属性模式检查，默认关闭。
  unocss: true,
  // 只格式化 HTML；样式和 Markdown 分别交给 Stylelint、Markdownlint。
  formatters: { html: true, css: false, markdown: false },
})
```

## 本包的规则覆盖

逐项展示上游默认值、本包配置和输入代码触发的诊断。每例先对照“只检查”与“自动修复”的行为，再展示输入和正确写法。正确写法明确标注自动修复结果或手动修正；关闭规则可能允许原输入，并不意味着工具会将它改成正确写法。示例聚焦当前规则，不代表完整预设的全部检查结果。error / warn 是诊断级别，与能否修复无关。支持自动修复的已启用规则在执行修复命令时应用；规则关闭、输入无诊断、不提供自动修复是三种不同情况。编辑器的修正建议需要手动确认，不属于自动修复。

ESLint 上游对照启用相同的语言集成，不叠加本包规则差异。

Vue 规则完全沿用上游；TOML、测试和 pnpm 的本包差异按对应文件作用域生效。

### 注释中的代码示例

`sonarjs/no-commented-code`：本包为 `off`，上游默认 `error`。允许保留带说明的可选代码示例；此规则不能自动区分示例与废弃代码。其他 antislop 检查保持开启，消费方可通过 `antislop.overrides` 或 `rules` 重新开启此规则。

```js [example.js]
/**
 * 从文件读取环境变量，需要时启用下面的调用。
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();
```

本包保留原输入，不产生本规则诊断；上游报告错误且不提供自动修复。

### 通用语法与运行时

#### `antfu/no-top-level-await` {#rule-antfu-no-top-level-await}

本包：`off`；上游默认：`error`。

默认允许 ESM 顶层 `await`，不要求为异步初始化额外包装函数。依赖该模块的执行链会等待初始化完成，但不会因此阻塞整个线程；应避免在公共入口执行不必要的耗时操作。此规则只限制语法，不判断初始化耗时。消费方可通过 `rules` 或 `javascript.overrides` 将它设为 `warn` 或 `error`。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 无本规则诊断，允许原输入 | 保留原样 |
| 上游 | error：禁止顶层 await | 不提供自动修复，需手动调整初始化方式 |

::: code-group

```ts [example.ts]
// 本包允许此写法；导入本模块的执行链等待配置加载完成。
const settings = await loadSettings()
export default settings
```

:::

#### `no-console` {#rule-no-console}

本包：`warn`；上游默认：`error（选项见代码）`。

本包以警告级别检查，上游以错误级别检查；输入约束保持一致。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 最终值继承上游 allow 参数，仅将级别调整为 warn。
  "no-console": [
    "warn",
    {
      // 保留上游允许的警告与错误日志；其他 console 方法报告警告。
      "allow": ["warn", "error"]
    }
  ]
}
```

```jsonc [上游规则值]
{
  // console 方法调用检查；当前启用，按以下主选项和例外执行。
  "no-console": [
    // 诊断级别；error 报错、warn 警告、off 关闭。
    "error",
    // 次级选项，补充语法例外和报告方式。
    {
      // 允许调用这些 console 方法；其他方法仍检查。
      "allow": [
        "warn",
        "error"
      ]
    }
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 不提供自动修复，需手动修改 |
| 上游 | error：此处不允许 console 输出（no-console）。 | 不提供自动修复；编辑器修正建议需手动确认 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```js [example.js（输入代码）]
console.log('服务已启动')
```

```js [example.js（正确写法：手动修正）]
export function start(log) {
  // 将输出交给调用方提供的日志函数，不直接调用 console。
  log('服务已启动')
}
```

:::

#### `no-undef` {#rule-no-undef}

本包：`warn`；上游默认：`error（选项见代码）`。

本包以警告级别检查，上游以错误级别检查；输入约束保持一致。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 最终值保留上游参数，仅将级别调整为 warn。
  "no-undef": [
    "warn",
    {
      // 沿用上游：不额外检查 typeof 表达式中的未定义标识符。
      "typeof": false
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 未声明标识符检查；当前启用，按以下主选项和例外执行。
  "no-undef": [
    // 诊断级别；error 报错、warn 警告、off 关闭。
    "error",
    // 次级选项，补充语法例外和报告方式。
    {
      // 是否同时检查 typeof 表达式中的未定义标识符。
      "typeof": false
    }
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 不提供自动修复，需手动修改 |
| 上游 | error：externalBridge 未定义；需要由运行环境提供或正确声明，不会自动创建（no-undef）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```js [example.js（输入代码）]
externalBridge.send('ready')
```

```js [example.js（正确写法：手动修正）]
export function notify(externalBridge) {
  // 由调用方传入运行环境提供的对象。
  externalBridge.send('ready')
}
```

:::

#### `no-restricted-syntax` {#rule-no-restricted-syntax}

本包：`warn`；上游默认：`error（选项见代码）`。

只将上游语法限制的级别调整为 warn，选择器完整继承上游，不额外添加 debugger、标签语句或 with。当前上游检查 const enum 与 export assignment；声明文件中的 export = 继续享有上游豁免。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // 最终值：本包只调整级别，以下选择器由上游生成，不在源码重复维护。
  "no-restricted-syntax": [
    "warn",
    // 上游禁止 const enum。
    "TSEnumDeclaration[const=true]",
    // 上游禁止实现文件中的 export =。
    "TSExportAssignment"
  ]
}
```

```jsonc [上游规则值]
{
  // 受限语法节点检查；当前启用，按以下主选项和例外执行。
  "no-restricted-syntax": [
    // 诊断级别；error 报错、warn 警告、off 关闭。
    "error",
    // 禁止 const enum。
    "TSEnumDeclaration[const=true]",
    // 禁止实现文件的 export = 赋值导出。
    "TSExportAssignment"
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 不提供自动修复，需手动修改 |
| 上游 | error：不允许 const enum，可使用合适的常量表示（no-restricted-syntax）。；error：实现文件应使用 ESM 导出，而非 export =（no-restricted-syntax）。 | 不提供自动修复，需手动修改 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```ts [example.ts（输入代码）]
const enum State { Ready }
const value = 1
export = value
```

```ts [example.ts（正确写法：手动修正）]
export const State = { Ready: 0 } as const
export const value = 1
```

:::

### 代码风格

#### `antfu/consistent-chaining` {#rule-antfu-consistent-chaining}

本包：`warn`；上游默认：`error`。

本包以警告级别检查，上游以错误级别检查；输入约束保持一致。下面故意让 filter 与 map 在同一行、join 在下一行；两种配置都要求一致换行，本包报告警告，上游报告错误。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 支持自动修复，执行修复命令时应用 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```ts [example.ts（输入代码）]
const names = users
  .filter(isActive).map(toName)
  .join(', ')
```

```ts [example.ts（正确写法：自动修复结果）]
const names = users
  .filter(isActive)
  .map(toName)
  .join(', ')
```

:::

#### `antfu/consistent-list-newline` {#rule-antfu-consistent-list-newline}

本包：`warn`；上游默认：`error`。

本包以警告级别检查，上游以错误级别检查；输入约束保持一致。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 支持自动修复，执行修复命令时应用 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```ts [example.ts（输入代码）]
const values = [
  1, 2,
  3,
]
```

```ts [example.ts（正确写法：自动修复结果）]
const values = [
  1,
  2,
  3,
]
```

:::

#### `antfu/curly` {#rule-antfu-curly}

本包：`warn`；上游默认：`error`。

不额外要求下面的多行调用使用大括号；消费方恢复 error 后，会要求包围这类多行语句。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 支持自动修复，执行修复命令时应用 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```ts [example.ts（输入代码）]
if (ready)
  run(
    first,
    second,
  )
```

```ts [example.ts（正确写法：自动修复结果）]
if (ready) {
  run(
    first,
    second,
  )
}
```

:::

#### `antfu/if-newline` {#rule-antfu-if-newline}

本包：`warn`；上游默认：`error`。

不强制 if 的执行语句另起一行。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 支持自动修复，执行修复命令时应用 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```ts [example.ts（输入代码）]
if (ready) run()
```

```ts [example.ts（正确写法：自动修复结果）]
if (ready)
  run()
```

:::

#### `antfu/top-level-function` {#rule-antfu-top-level-function}

本包：`warn`；上游默认：`error`。

允许顶层使用箭头函数，不强制改为 function 声明。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | warn（警告）：输入触发当前规则 | 支持自动修复，执行修复命令时应用 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```ts [example.ts（输入代码）]
export const greet = (name: string) => {
  return `你好，${name}`
}
```

```ts [example.ts（正确写法：自动修复结果）]
export function greet (name: string) {
  return `你好，${name}`
}
```

:::

### TOML 注释

#### `toml/spaced-comment` {#rule-toml-spaced-comment}

本包：`off`；上游默认：`error`。

TOML 插件的注释空格规则也关闭，因此不会把 #:schema 改成 # :schema。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | toml/spaced-comment 未启用，原样保留这段写法。 | 规则已关闭，不执行修复；该规则本身支持自动修复 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```toml [settings.toml（输入代码）]
#:schema https://example.com/settings.schema.json
name = "demo"
```

```toml [settings.toml（正确写法：自动修复结果）]
# :schema https://example.com/settings.schema.json
name = "demo"
```

:::

### 测试运行器

#### `test/no-import-node-test` {#rule-test-no-import-node-test}

本包：`off`；上游默认：`error`。

测试文件可以使用 Node.js 原生测试，不要求改写成 Vitest 导入。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | test/no-import-node-test 未启用，原样保留这段写法。 | 规则已关闭，不执行修复；该规则本身支持自动修复 |
| 上游 | error（错误）：输入触发当前规则 | 自动修改，修复后当前规则无诊断 |

下方给出启用该规则时的修复结果；warn 与 error 都支持执行规则提供的自动修复。

::: code-group

```js [example.test.js（输入代码）]
import { test } from 'node:test'
test('基础行为', () => {})
```

```js [example.test.js（正确写法：自动修复结果）]
import { test } from 'vitest'
test('基础行为', () => {})
```

:::

### pnpm 工作区

#### `pnpm/yaml-enforce-settings` {#rule-pnpm-yaml-enforce-settings}

本包与上游均启用此规则，唯一差异是本包不强制 `settings.trustPolicy`。其他设置保持上游原值，消费方手动设置的 trustPolicy 也不会被本包删除。

::: code-group

```jsonc [本包规则值]
{
  // 仍检查上游指定的字段；本包只移除 trustPolicy 的强制值。
  "pnpm/yaml-enforce-settings": [
    // 缺少或不符合所列设置时报错，并允许规则提供自动修复。
    "error",
    {
      // settings 只包含这条规则需要强制的字段。
      "settings": {
        // 沿用上游：清理过期的依赖发布时长豁免项。
        "minimumReleaseAgeExcludePrune": true,
        // 沿用上游：启用跨平台 Shell 模拟器。
        "shellEmulator": true
      }
    }
  ]
}
```

```jsonc [上游规则值]
{
  // 仍检查上游指定的字段；本包只移除 trustPolicy 的强制值。
  "pnpm/yaml-enforce-settings": [
    // 缺少或不符合所列设置时报错，并允许规则提供自动修复。
    "error",
    {
      // settings 只包含这条规则需要强制的字段。
      "settings": {
        // 沿用上游：清理过期的依赖发布时长豁免项。
        "minimumReleaseAgeExcludePrune": true,
        // 沿用上游：启用跨平台 Shell 模拟器。
        "shellEmulator": true,
        // 仅上游强制，本包不替消费方添加该依赖信任策略。
        "trustPolicy": "no-downgrade"
      }
    }
  ]
}
```

:::

下面按完整默认配置执行自动修复。输入缺少上游要求的 workspace 设置，本包只取消 trustPolicy 的强制写入，其他设置保持继承：

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 报告缺少 minimumReleaseAgeExcludePrune、shellEmulator | 补充这两项，不添加 trustPolicy |
| 上游 | 还会报告缺少 trustPolicy | 补充三项，trustPolicy 为 no-downgrade |

两边修复结果确实不同，因此分别展示：

::: code-group

```yaml [pnpm-workspace.yaml（输入代码）]
packages:
  - packages/*
```

```yaml [pnpm-workspace.yaml（本包正确写法：自动修复结果）]
# 清理已失效的依赖发布时间豁免。
minimumReleaseAgeExcludePrune: true
# 使用 pnpm 的跨平台脚本 shell。
shellEmulator: true

packages:
  - packages/*
```

```yaml [pnpm-workspace.yaml（上游正确写法：自动修复结果）]
# 清理已失效的依赖发布时间豁免。
minimumReleaseAgeExcludePrune: true
# 上游禁止依赖版本降级时降低信任要求；本包不强制添加。
trustPolicy: no-downgrade
# 使用 pnpm 的跨平台脚本 shell。
shellEmulator: true

packages:
  - packages/*
```

:::

#### `pnpm/yaml-no-duplicate-catalog-item` {#rule-pnpm-yaml-no-duplicate-catalog-item}

本包：`error（选项见代码）`；上游默认：`error`。

当前 pnpm 插件虽将此规则标记为可修复，其报告实现没有附带 fix；实际重复诊断需要手动调整，不能只凭规则元数据判断。

同名依赖可以在默认和命名 catalog 中保留不同版本范围；完全相同的版本声明仍会报告重复。第一例的双版本输入已经符合本包策略，不需要删除其中一个版本。上游单版本参考只适用于确实不需要双版本的项目；需要双版本时，应保留本包 exact-version 策略。

规则参数：

::: code-group

```jsonc [本包规则值]
{
  // catalog 版本重复检查；当前启用，按以下主选项和例外执行。
  "pnpm/yaml-no-duplicate-catalog-item": [
    // 诊断级别；error 报错、warn 警告、off 关闭。
    "error",
    // 次级选项，补充语法例外和报告方式。
    {
      // 决定 catalog 重复项如何判定；exact-version 只比较相同版本声明。
      "checkDuplicates": "exact-version"
    }
  ]
}
```

```jsonc [上游规则值]
{
  // catalog 版本重复检查；当前启用，按以下主选项和例外执行。
  "pnpm/yaml-no-duplicate-catalog-item": [
    // 诊断级别；error 报错、warn 警告、off 关闭。
    "error"
  ]
}
```

:::

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | 这段写法未触发当前规则，保持原样。 | 当前版本不提供此诊断的自动修复，需手动调整 |
| 上游 | error：catalog 中出现了当前策略认为重复的依赖版本声明（pnpm/yaml-no-duplicate-catalog-item）。 | 当前版本不提供此诊断的自动修复，需手动调整 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```yaml [pnpm-workspace.yaml（输入代码）]
catalog:
  typescript: ^7.0.2
catalogs:
  typescript6:
    typescript: ^6.0.3
```

```yaml [pnpm-workspace.yaml（本包正确写法：无需修改）]
catalog:
  typescript: ^7.0.2
catalogs:
  typescript6:
    typescript: ^6.0.3
```

```yaml [pnpm-workspace.yaml（上游单版本参考：手动调整）]
# 仅在项目确实只需要一个版本时，才可合并 catalog。
catalog:
  typescript: ^7.0.2
```

:::

补充输入：检查仍会报告的情况。

| 配置 | 只检查输入时的结果 | 执行自动修复 |
| --- | --- | --- |
| 本包 | error：catalog 中出现了当前策略认为重复的依赖版本声明（pnpm/yaml-no-duplicate-catalog-item）。 | 当前版本不提供此诊断的自动修复，需手动调整 |
| 上游 | error：catalog 中出现了当前策略认为重复的依赖版本声明（pnpm/yaml-no-duplicate-catalog-item）。 | 当前版本不提供此诊断的自动修复，需手动调整 |

下方是手动修正示例，不是工具自动输出；规则关闭时原输入也可能被允许。

::: code-group

```yaml [pnpm-workspace.yaml（输入代码）]
catalog:
  vue: ^3.5.0
catalogs:
  duplicate:
    vue: ^3.5.0
```

```yaml [pnpm-workspace.yaml（正确写法：手动修正）]
catalog:
  vue: ^3.5.0
```

:::

## 消费方如何调整规则

消费项目可以只覆盖需要改变的规则：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
  rules: {
    // 覆盖 console 使用限制，实际诊断级别由当前规则值决定。
    'no-console': 'warn',
    // 限制列表中声明的语法节点；未列出的节点继续由其他规则处理。
    'no-restricted-syntax': 'off',
  },
})
```

`rules` 会在本包默认规则之后应用，因此同名规则由消费项目的值生效。它是高优先级全局覆盖，也可能覆盖上游语言或声明文件豁免。只想调整某个集成时，优先保留其作用域：JavaScript、Vue 等使用 `javascript.overrides`、`vue.overrides`，导入规则使用 `imports.overrides`，不使用未声明的 `overrides.imports`。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 各集成对象内使用正式的 overrides 入口，不使用已弃用的顶层 overrides。
  javascript: {
    // 仅调整 JavaScript 功能组中的 console 使用限制。
    overrides: { 'no-console': 'warn' },
  },
  vue: {
    // 仅关闭 Vue 可选 Prop 默认值检查。
    overrides: { 'vue/require-default-prop': 'off' },
  },
  // 调整上游导入规则集，只影响该功能组的规则覆盖。
  imports: {
    // 按上游功能组覆盖规则；imports 的覆盖通过 imports.overrides 传入。
    overrides: {
      // 消费方显式调整该条报告级别；共享默认仍继承上游 error。
      'antfu/no-import-dist': 'warn' },
  },
})
```

## linterOptions

本包默认将未使用的 `eslint-disable` 注释与未使用的行内规则配置报告为 warning，不改变 CLI 的修复、缓存或文件写回策略：

| 选项 | 默认值 | 报告内容 |
| --- | --- | --- |
| `reportUnusedDisableDirectives` | `'warn'` | 未使用的禁用注释 |
| `reportUnusedInlineConfigs` | `'warn'` | 未使用的行内规则配置 |

示例：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 ESLint 自身的诊断行为，不是单条 lint 规则或 CLI 参数。
  linterOptions: {
    // 报告未实际禁用任何诊断的 eslint-disable 注释，级别由此值决定。
    reportUnusedDisableDirectives: 'error',
    // 报告未改变实际规则配置的内联配置注释，级别由此值决定。
    reportUnusedInlineConfigs: 'off',
  },
})
```

`--fix`、`--cache` 和 `--cache-location` 是 ESLint CLI 行为，不会因为使用共享配置而自动打开。

## 忽略行为

默认路径按“antfu 静态默认 → 本包追加 → 消费方追加”合并。下面列出具体模式，页签用于对照读取结果，**不需要把默认数组再抄进项目配置**。

::: code-group

```jsonc [本包默认（含上游）]
[
  // 依赖安装目录，由包管理器维护。
  "**/node_modules",
  // 构建输出或发布制品。
  "**/dist",
  // 包管理器锁文件，不按应用源码处理。
  "**/package-lock.json",
  // 包管理器锁文件，不按应用源码处理。
  "**/yarn.lock",
  // 包管理器锁文件，不按应用源码处理。
  "**/pnpm-lock.yaml",
  // 包管理器锁文件，不按应用源码处理。
  "**/bun.lockb",
  // 构建输出或发布制品。
  "**/output",
  // 测试覆盖率产物。
  "**/coverage",
  // 临时内容、工具生成配置或历史记录。
  "**/temp",
  // 临时内容、工具生成配置或历史记录。
  "**/.temp",
  // 临时内容、工具生成配置或历史记录。
  "**/tmp",
  // 临时内容、工具生成配置或历史记录。
  "**/.tmp",
  // 临时内容、工具生成配置或历史记录。
  "**/.history",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vitepress/cache",
  // 框架生成内容或开发缓存。
  "**/.nuxt",
  // 框架生成内容或开发缓存。
  "**/.next",
  // 框架生成内容或开发缓存。
  "**/.svelte-kit",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vercel",
  // 发布版本的变更说明。
  "**/.changeset",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.idea",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.cache",
  // 构建输出或发布制品。
  "**/.output",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vite-inspect",
  // Yarn 的安装与缓存数据。
  "**/.yarn",
  // 版本记录或许可证文件，不按应用代码检查。
  "**/CHANGELOG*.md",
  // 版本记录或许可证文件，不按应用代码检查。
  "**/LICENSE*",
  // 已压缩的生成文件。
  "**/*.min.*",
  // 测试快照及快照资源。
  "**/__snapshots__",
  // 临时内容、工具生成配置或历史记录。
  "**/vite.config.*.timestamp-*",
  // 自动生成的类型声明。
  "**/auto-import?(s).d.ts",
  // 自动生成的类型声明。
  "**/components.d.ts",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.context",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.claude",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.agents",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.*/skills",
  // 构建输出或发布制品。
  "**/dist-*",
  // 构建输出或发布制品。
  "**/*-dist",
  // 框架生成内容或开发缓存。
  "**/.nitro",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.wrangler/**",
  // 构建输出或发布制品。
  "**/releases/**",
  // 原生工程及其生成内容，由对应工具链管理。
  "**/src-tauri/**",
  // 备份副本，不作为当前源码检查。
  "**/backup/**",
  // 代码分析工具生成的索引。
  "**/.codegraph/**",
  // 排除嵌套仓库的 Git 元数据，补齐原生根级忽略。
  "**/.git/**",
  // 测试快照及快照资源。
  "**/*.snap",
  // 二进制字体资源，不由文本规则检查。
  "**/*.ttf",
  // 二进制字体资源，不由文本规则检查。
  "**/*.woff"
]
```

```jsonc [上游 antfu 默认]
[
  // 依赖安装目录，由包管理器维护。
  "**/node_modules",
  // 构建输出或发布制品。
  "**/dist",
  // 包管理器锁文件，不按应用源码处理。
  "**/package-lock.json",
  // 包管理器锁文件，不按应用源码处理。
  "**/yarn.lock",
  // 包管理器锁文件，不按应用源码处理。
  "**/pnpm-lock.yaml",
  // 包管理器锁文件，不按应用源码处理。
  "**/bun.lockb",
  // 构建输出或发布制品。
  "**/output",
  // 测试覆盖率产物。
  "**/coverage",
  // 临时内容、工具生成配置或历史记录。
  "**/temp",
  // 临时内容、工具生成配置或历史记录。
  "**/.temp",
  // 临时内容、工具生成配置或历史记录。
  "**/tmp",
  // 临时内容、工具生成配置或历史记录。
  "**/.tmp",
  // 临时内容、工具生成配置或历史记录。
  "**/.history",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vitepress/cache",
  // 框架生成内容或开发缓存。
  "**/.nuxt",
  // 框架生成内容或开发缓存。
  "**/.next",
  // 框架生成内容或开发缓存。
  "**/.svelte-kit",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vercel",
  // 发布版本的变更说明。
  "**/.changeset",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.idea",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.cache",
  // 构建输出或发布制品。
  "**/.output",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.vite-inspect",
  // Yarn 的安装与缓存数据。
  "**/.yarn",
  // 版本记录或许可证文件，不按应用代码检查。
  "**/CHANGELOG*.md",
  // 版本记录或许可证文件，不按应用代码检查。
  "**/LICENSE*",
  // 已压缩的生成文件。
  "**/*.min.*",
  // 测试快照及快照资源。
  "**/__snapshots__",
  // 临时内容、工具生成配置或历史记录。
  "**/vite.config.*.timestamp-*",
  // 自动生成的类型声明。
  "**/auto-import?(s).d.ts",
  // 自动生成的类型声明。
  "**/components.d.ts",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.context",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.claude",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.agents",
  // 协作工具配置与技能资料，不按应用代码检查。
  "**/.*/skills"
]
```

```jsonc [本包追加]
[
  // 构建输出或发布制品。
  "**/dist-*",
  // 构建输出或发布制品。
  "**/*-dist",
  // 框架生成内容或开发缓存。
  "**/.nitro",
  // 构建、编辑器或部署工具的本地缓存。
  "**/.wrangler/**",
  // 构建输出或发布制品。
  "**/releases/**",
  // 原生工程及其生成内容，由对应工具链管理。
  "**/src-tauri/**",
  // 备份副本，不作为当前源码检查。
  "**/backup/**",
  // 代码分析工具生成的索引。
  "**/.codegraph/**",
  // 排除嵌套仓库的 Git 元数据，补齐原生根级忽略。
  "**/.git/**",
  // 测试快照及快照资源。
  "**/*.snap",
  // 二进制字体资源，不由文本规则检查。
  "**/*.ttf",
  // 二进制字体资源，不由文本规则检查。
  "**/*.woff"
]
```

```js [eslint.config.js（消费方追加）]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 只追加消费项目自己的目录，保留上游与本包默认列表。
  ignores: ['generated/**', 'vendor/**'],
})
```

:::

ESLint 自身的默认忽略、项目 .gitignore、后续配置片段还会独立参与结果，不能把这份静态数组当作任意项目最终的完整忽略结果。需要完全接管本包入口或使用回调时，按下方的正式配置处理。

### 完全接管通用忽略项

只有消费项目必须自己定义完整结果时，才设置 `defaultIgnores: false`：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 控制是否保留共享工厂提供的默认忽略项；与 ignores 的项目追加项分开管理。
  defaultIgnores: false,
  // 将匹配路径排除在当前工具的扫描范围之外；glob 相对工具规定的配置根解析。
  ignores: [
    'dist/**',
    'coverage/**',
  ],
})
```

对上面的数组输入，这会同时移除该入口中的 antfu 默认忽略项和本包通用忽略项，仅使用消费方数组；不是只停止追加本包列表。若 `ignores` 是回调，则直接交给 antfu，由回调决定是否保留其收到的上游列表，不再注入本包列表。该开关不会关闭 antfu 独立的 `.gitignore` 集成，也不控制后续片段或 ESLint 自身的忽略行为。

### 自定义 ignores 函数

需要基于上游忽略列表计算结果时，可以传函数：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 将匹配路径排除在当前工具的扫描范围之外；glob 相对工具规定的配置根解析。
  ignores: (defaults) => [
    ...defaults,
    'generated/**',
  ],
})
```

函数收到的是当前阶段已经生成的忽略列表；不要在函数中重复复制 antfu 的默认路径。

## 文件类型和检查职责

| 文件 | 主要配置来源 | 说明 |
| --- | --- | --- |
| `.js`、`.mjs`、`.cjs` | antfu JavaScript 集成及本包默认差异 | JavaScript 和 Node 规则 |
| `.ts`、`.mts`、`.cts` | antfu TypeScript 集成及上游文件级豁免 | 类型语法和 TypeScript 规则 |
| `.vue` | antfu Vue 集成及本包默认差异 | script、template 和组件约定 |
| `.json`、`.jsonc` | antfu JSON 集成 | package metadata 和 JSON 文件 |
| `.yaml`、`.yml` | antfu YAML / pnpm 集成 | workspace 和普通 YAML |
| `.toml` | antfu TOML 集成 | TOML 配置文件 |
| `.md` | antfu Markdown 集成 | Markdown 结构和代码块 |
| `.css`、`.scss` | 不由 ESLint 负责 | 使用 `@zzjtnb/stylelint-config` |
