# @zzjtnb/eslint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Feslint-config?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Feslint-config?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center"><strong>基于 @antfu/eslint-config 的 TypeScript / Vue / pnpm ESLint Flat Config</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="./README.md">English</a></p>

## 定位

本包不是另一套 ESLint 生态，而是对 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的带明确偏好的薄封装：

- parser、插件、推荐规则和排序规则由 antfu 负责；
- 本包只提供少量、有文档说明的默认值和可复用异步配置工厂；
- 不直接安装 `eslint-plugin-jsonc`、`eslint-plugin-n`、`eslint-plugin-pnpm`、`eslint-plugin-vue` 或 `yaml-eslint-parser`；
- 不删除、替换或重复实现 antfu 已提供的排序配置。

## 环境要求

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.4.0` |

本包为 ESM-only，推荐使用 `eslint.config.ts`；无法加载 TypeScript 配置时，ESM 项目使用 `eslint.config.js`，其它项目使用 `eslint.config.mjs`。

## 安装与基本用法

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

```ts
// eslint.config.ts
import zzjtnb from '@zzjtnb/eslint-config'

export default zzjtnb()
```

默认导出与命名导出 `zzjtnb` 指向同一个配置工厂。如果更喜欢命名导入，也可以这样写：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

默认配置启用 TypeScript、Vue、JSON / JSONC、YAML、TOML、Markdown、Node、pnpm、antfu 排序和 antfu stylistic 规则。UnoCSS 和外部 formatter 集成默认保持可选。

## `stylistic` 到底有哪些选项

`stylistic` **不是只有 `semi` 一个选项**，它支持两种形态：

```ts
// 关闭全部 antfu stylistic 格式规则。
export default zzjtnb({ stylistic: false })

// 开启 stylistic，并只把分号改为必需；其它字段继续使用 antfu 默认值。
export default zzjtnb({ stylistic: { semi: true } })

// 显式开启上游默认格式规则。
export default zzjtnb({ stylistic: true })
```

当前 `@antfu/eslint-config` 的 `OptionsConfig['stylistic']` 对象支持以下字段：

| 字段 | 类型 | 作用 | 上游默认值 |
| --- | --- | --- | --- |
| `indent` | `2`、`4`、`'tab'` 等上游支持的缩进值 | 控制缩进级别和制表符策略 | `2` |
| `quotes` | `'single'`、`'double'`、`'backtick'` | 控制字符串引号风格 | `'single'` |
| `jsx` | `boolean` | 是否对 JSX 启用 stylistic 规则 | `true` |
| `semi` | `boolean` | 是否要求语句末尾分号 | `false` |
| `braceStyle` | `'1tbs'`、`'stroustrup'`、`'allman'` | 控制大括号换行风格 | `'stroustrup'` |
| `experimental` | `boolean` | 是否启用上游实验性 stylistic 规则 | `false` |

这些字段是 **antfu 的上游选项**，不是本包自行设计的字段。当前版本的准确类型会通过本包导出的 `ESLintStylisticOptions` 提供：

```ts
import type { ESLintStylisticOptions } from '@zzjtnb/eslint-config'

const styleOptions = {
  quotes: 'single',
  semi: false,
} satisfies ESLintStylisticOptions
```

查看来源：

- antfu 用户配置说明：[Customization](https://github.com/antfu/eslint-config#customization)
- antfu 的 stylistic 工厂：[src/configs/stylistic.ts](https://github.com/antfu/eslint-config/blob/main/src/configs/stylistic.ts)
- ESLint Stylistic 官方文档：[eslint.style](https://eslint.style/)

`stylistic: false` 和 `stylistic: { semi: true }` 不是等价写法：前者关闭整组格式规则，后者开启整组格式规则并覆盖一个字段。

本包默认使用 `stylistic: true`。使用独立 formatter 的消费方，应在引入处传入 `stylistic: false`。

## 公共导出与规则归属

本包的公共 API 分为三类：

| 导出 | 用途 |
| --- | --- |
| 默认导出 `zzjtnb()` | 创建完整 ESLint Flat Config |
| 命名导出 `zzjtnb()` | 创建完整 ESLint Flat Config |
| `base()`、`vue()`、`uno()` | 创建常用项目预设 |
| `javascript()`、`ignores()`、`jsonc()`、`node()`、`perfectionist()`、`pnpm()`、`typescript()`、`yaml()` | 按需组合单项配置工厂 |
| `ESLintConfigOptions`、`ESLintStylisticOptions` | 为消费方提供 TypeScript 类型提示 |

这些工厂返回 `Promise<Linter.Config[]>`，可以直接作为 `eslint.config.ts` 的默认导出。parser、插件、推荐规则和排序规则由 `@antfu/eslint-config` 负责；本包只追加文档中公开说明的规则覆盖。

### 排序规则的唯一来源

以下规则不在本包重复实现：

- imports / exports 和 named imports / named exports 排序；
- package.json、tsconfig.json 和 pnpm workspace YAML 排序；
- perfectionist 的对象、接口和模块排序。

它们统一跟随 antfu，本包不再提供第二套排序实现。

### 可选集成和依赖

本包只直接依赖 `@antfu/eslint-config`，不会把上游已经管理的 parser 或 `eslint-plugin-*` 再安装一遍。UnoCSS 和 formatter 遵循 antfu 的可选依赖方式：只有在消费方启用时，才按上游文档安装对应依赖。

antfu 的 Markdown 集成跟随上游默认值保持启用。可选外部 formatter 集成仅在消费方显式配置后启用。

## 选项

本包接受 `@antfu/eslint-config` 的选项，并额外增加以下字段：

| 字段 | 默认值 | 作用 |
| --- | --- | --- |
| `defaultIgnores` | `[]` | 添加可复用忽略项；传 `false` 时替换包括 antfu 在内的全部默认项 |
| `pnpmWorkspace` | `true` | 是否启用 `pnpm-workspace.yaml` 的 parser、规则和排序 |
| `rules` | `{}` | 追加或覆盖本包的通用规则 |
| `ignores` | `[]` | 在选定默认忽略项后追加消费方路径 |
| `linterOptions` | 两项 warning | 控制未使用 ESLint 注释的报告级别 |

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 上游选项：库项目启用更严格的 library 规则。
  type: 'lib',

  // 上游选项：关闭格式规则，由其它 formatter 完全负责格式。
  stylistic: false,

  // 上游选项：开启分号，其它 stylistic 字段保持上游默认值。
  // stylistic: { semi: true },

  // 本包选项：追加生成目录忽略项。
  ignores: ['generated/**'],

  // 本包选项：不检查 pnpm-workspace.yaml。
  pnpmWorkspace: false,

  // 本包选项：消费方覆盖通用规则。
  rules: { 'no-console': 'error' },

  // Flat Config 选项：warning 不会直接让 ESLint 失败。
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

完整的上游选项以 [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) 和 antfu README 为准；不要把上游已有字段再次写成本包自己的配置。

## 预设函数

```ts
import { base, zzjtnb, uno, vue } from '@zzjtnb/eslint-config'

// 默认完整配置。
export default zzjtnb()

// JavaScript / TypeScript 配置，关闭 Vue 和 UnoCSS。
export const baseConfig = base()

// 显式启用 Vue 的配置。
export const vueConfig = vue()

// 显式启用 UnoCSS；消费方需要自行安装上游要求的可选依赖。
export const unoConfig = uno()
```

## 默认行为

| 集成 | 默认状态 | 责任来源 |
| --- | --- | --- |
| TypeScript | 启用 | antfu `typescript()` |
| Vue | 启用 | antfu `vue()` + 本包 Vue 约定 |
| Node | 启用 | antfu `node()` |
| JSON / JSONC | 启用 | antfu `jsonc()` |
| YAML | 启用 | antfu `yaml()` |
| TOML | 启用 | antfu 主工厂 |
| pnpm | 启用 | antfu `pnpm()` |
| perfectionist | 启用 | antfu 主工厂 |
| Stylistic | 启用 | antfu；使用独立 formatter 的消费方在调用 `zzjtnb()` 时关闭 |
| UnoCSS | 关闭 | 上游可选集成 |
| Markdown | 启用 | antfu `markdown()` |
| 外部 formatter | 关闭 | antfu 可选集成 |

### 外部 formatter 与 Markdown 职责

需要由 antfu 负责外部格式化时，可显式启用 formatter 集成。使用独立 Markdown linter 的消费方，可在引入处关闭 antfu Markdown：

```ts
export default zzjtnb({
  // 需要安装 antfu 的可选 peer：eslint-plugin-format。
  formatters: { css: true },
  // Markdown 文件由独立 Markdown linter 负责。
  markdown: false,
})
```

如果还需要格式化 Markdown，可以额外使用 `formatters: { markdown: 'prettier' }`。可选 formatter 依赖和支持的值以 antfu 官方文档为准。

### pnpm workspace

`pnpm()` 调用 antfu 的公开工厂并传入：

- `json: true`：检查 package.json 中的 pnpm catalog / workspace 配置；
- `yaml: true`：解析 pnpm-workspace.yaml；
- `sort: true`：默认启用 workspace YAML 排序。

设置 `pnpmWorkspace: false` 只关闭 workspace YAML 这一段，仍保留 package.json 的 pnpm 检查。已启用的 pnpm 规则，包括上游 workspace 策略规则，均保持 antfu 默认行为。

### 默认忽略项

本包不猜测消费方的特有路径。antfu 的默认忽略项和 `.gitignore` 支持保持启用。仓库特有产物通过 `ignores` 追加；需要可复用的共享忽略项时，可通过 `defaultIgnores` 传入。只有需要替换全部忽略项时才传入 `defaultIgnores: false`。

## VS Code

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
    "source.organizeImports": "never"
  },
  "eslint.validate": ["javascript", "typescript", "vue", "json", "jsonc", "yaml", "toml"]
}
```

## 检查命令

```json
{
  "scripts": {
    "lint": "eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache"
  }
}
```

`--fix`、`--cache` 和 `--cache-location` 是 ESLint CLI 参数，不属于 Flat Config；共享配置不会偷偷修改消费方的执行方式。

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
