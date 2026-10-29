# @zzjtnb/eslint-config

[![@zzjtnb/eslint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>基于 @antfu/eslint-config 的 TypeScript、Vue 与 pnpm ESLint Flat Config</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/README.md">English</a></p>

## 功能简介

为 TypeScript、JavaScript 和 Vue 项目提供统一的 ESLint 配置。默认开启 Vue 无障碍与代码质量检查，也可以按需开启 UnoCSS 和其他格式化工具。

[完整使用文档](https://lint.docs.zzjtnb.com/eslint)

## 环境要求与安装

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.13.0` |

```bash
# 安装 ESLint 工具与共享配置。
pnpm add -D eslint @zzjtnb/eslint-config
```

项目的 `package.json` 声明 `"type": "module"`，配置使用 `eslint.config.js`，不需要 TypeScript 配置加载器或额外运行 flag。未声明 ESM 的项目可使用 `eslint.config.mjs`。

## 最小配置

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

直接调用时默认启用本包提供的 TypeScript、Vue、JSON / JSONC、YAML、TOML、Markdown、Node、perfectionist 和 stylistic 集成。pnpm 集成沿用 antfu 的默认行为，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用。UnoCSS 和外部 formatter 集成仍需显式开启。

## 按需扩展

本包提供 UnoCSS、Vue 无障碍、formatter 和 antislop 的插件依赖。Vue 无障碍和 antislop 默认开启，UnoCSS、formatter 按 antfu 正式选项显式启用。shadcn 保留注册，不自动开启全部规则。

默认关闭 `sonarjs/no-commented-code`，允许保留注释中的可选代码示例；其他 antislop 检查保持开启，可通过 `antislop.overrides` 或 `rules` 调整。

各能力的用途、适用场景与调整入口见 [扩展能力说明](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/docs/src/eslint/presets.md#按需扩展)。UnoCSS 检查工具类，Vue 无障碍检查模板可访问性，formatter 负责格式转换，antislop 检查代码与注释质量，shadcn 用于 Tailwind v4 设计系统契约。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 启用 UnoCSS 类名排序与属性模式检查，默认关闭。
  unocss: true,
  // 只格式化 HTML；样式和 Markdown 分别交给 Stylelint、Markdownlint。
  formatters: { html: true, css: false, markdown: false },
})
```

## 完整配置

下面的配置保留语言默认值，显式展示常用集成开关，追加项目级忽略路径并覆盖规则与报告选项。pnpm 不在此强制启用，仍按是否存在 `pnpm-workspace.yaml` 自动判断；只需最小默认值时，直接使用 `zzjtnb()`。这些集成字段沿用 antfu，不是本包重新定义的私有选项。

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 传给 @antfu/eslint-config 的语言和文件格式集成。
  typescript: true,
  // 配置 Vue 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  vue: true,
  // 配置 JSON/JSONC 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  jsonc: true,
  // 配置 YAML 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  yaml: true,
  // 配置 TOML 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  toml: true,
  // 配置 Markdown 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  markdown: true,
  // 配置 Node.js 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  node: true,

  // 保留 antfu 的 stylistic 规则；由其他 formatter 负责格式化时改为 false。
  stylistic: true,
  // 配置 UnoCSS 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  unocss: false,
  // 启用或配置额外文件格式化集成；不是 ESLint 原生的 --fix 参数。
  formatters: false,

  // 追加到 antfu 已解析的忽略列表之后。
  ignores: ['generated/**'],

  // 在全部共享默认规则之后应用，按规则名覆盖。
  rules: {
    // 覆盖 console 使用限制，实际诊断级别由当前规则值决定。
    'no-console': 'warn',
  },

  // ESLint 原生 Flat Config linter 选项。
  linterOptions: {
    // 报告未实际禁用任何诊断的 eslint-disable 注释，级别由此值决定。
    reportUnusedDisableDirectives: 'warn',
    // 报告未改变实际规则配置的内联配置注释，级别由此值决定。
    reportUnusedInlineConfigs: 'warn',
  },
})
```

需要追加另一个原生 Flat Config 配置片段时，将它放在第一个参数之后：

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // 配置 代码风格 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
    stylistic: false,
  },
  {
    // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
    files: ['scripts/**/*.ts'],
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 覆盖 console 使用限制，实际诊断级别由当前规则值决定。
      'no-console': 'off',
    },
  },
)
```

## TypeScript 与 NestJS

项目可以继续使用自己的 TypeScript 版本。本包为 ESLint 解析器提供 TypeScript 6；这是检查工具使用的依赖，不会替换项目编译器。使用新语法时，还需要确认当前 typescript-eslint 已支持它。

NestJS 的装饰器设置请按文件范围配置；启用类型感知检查时，也可以从 tsconfig 读取。具体写法见 [NestJS 配置](https://lint.docs.zzjtnb.com/eslint/configuration#nestjs-装饰器与依赖注入)。

## 修改默认配置

第一个参数设置语言开关、全局规则和忽略路径。需要只修改部分文件时，在后续参数中提供带 `files` 的配置对象；不要把 `files` 放进第一个参数。后续参数还支持 antfu 接受的配置数组、异步配置和 `FlatConfigComposer`。

| 输入 | 行为 |
| --- | --- |
| `typescript`、`vue`、`jsonc`、`yaml`、`toml`、`markdown`、`node`、`stylistic`、`unocss`、`formatters` 及其他 antfu 字段 | 原样传给 `@antfu/eslint-config`，不改名、不重新包装 |
| `pnpm` | 原样传给 antfu；只停止强制 trustPolicy，并使用 exact-version 判断 catalog 重复项 |
| `rules` | 在全部共享默认规则之后应用；可覆盖 JavaScript、TypeScript、Vue、TOML 等集成的规则，后续 Flat Config 片段仍有更高优先级 |
| `linterOptions` | ESLint 原生报告选项，不额外限制文件范围；后续匹配的配置片段可覆盖 |
| `imports` | 沿用 antfu 的导入集成开关与对象选项；规则覆盖使用 `imports.overrides`，不使用 `overrides.imports` |
| `ignores` | 数组追加到默认忽略项之后；回调接收默认列表并决定最终结果 |
| `defaultIgnores` | 数组替换本包列表；`false` 同时接管该入口中的上游与本包默认列表，不关闭独立的 `.gitignore` 集成 |
| 后续 Flat Config 配置片段 | 传给 antfu，并由 ESLint 根据配置片段顺序处理优先级 |

配置选项与 antfu 同名。修改某种语言的规则时，在对应的 `overrides` 中填写新值；修改所有文件的规则时，使用第一个参数的 `rules`。后续参数中的配置最后生效。全局规则也可能覆盖 TypeScript 声明文件的例外设置，因此只改 Vue 等单种语言时，优先使用 `vue.overrides` 等选项。

### Node.js 原生测试

测试集成默认关闭 `test/no-import-node-test`，保留 `node:test` 导入，不自动替换为 Vitest；上游其他测试规则继续生效。消费方可通过 `test.overrides`、首参 `rules` 或后置匹配的 Flat Config 片段覆盖。`test: false` 关闭测试集成。

### 格式化职责

本包默认启用 antfu 的 stylistic 规则。如果 Oxfmt、Prettier 或其他 formatter 是项目唯一的格式化工具，应在配置边界关闭 ESLint 格式化规则：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 代码风格 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  stylistic: false,
})
```

`stylistic: false` 会关闭 stylistic 规则集；`stylistic: { semi: true }` 会保留规则集并只修改 `semi` 选项，两者不是同一行为。关闭 stylistic 不会关闭 import、JSON、YAML 等独立集成中的排序或其他自动修复；格式化工具迁移时仍需按实际冲突划分职责。

外部 formatter 集成与 stylistic 规则是两个独立开关。本包已提供 `eslint-plugin-format`，无需额外安装；通过 `formatters` 显式开启后才生效：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 启用或配置额外文件格式化集成；不是 ESLint 原生的 --fix 参数。
  formatters: {
    // 配置 CSS 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
    css: true,
  },
})
```

完整的 formatter 和 stylistic 选项请以当前安装版本的 [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) 及其定制文档为准。

### UnoCSS

UnoCSS 检查按需开启，本包已提供对应 ESLint 插件；使用 UnoCSS 的项目直接开启即可，无需再次安装插件：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 配置 UnoCSS 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  unocss: true,
})
```

### pnpm workspace

`pnpm` 对象由 antfu 负责，因此它的字段、默认值、parser 注册和排序行为以当前安装的 antfu 版本为准。本包仅从该规则的 settings 中移除 trustPolicy，保留其他上游设置检查和自动修复；catalog 重复检查使用 `checkDuplicates: 'exact-version'`，允许命名 catalog 承载不同兼容版本，只报告包名和版本声明完全相同的重复。

- 不设置 `pnpm` 时，antfu 仅在当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用该集成，npm 和 yarn 项目无需任何设置。
- `pnpm: true` 会强制启用该集成，要求存在 `pnpm-workspace.yaml`，否则检查 `package.json` 时 ESLint 会在加载 `pnpm/*` 规则时报错。
- `pnpm: false` 会关闭 antfu 的 pnpm 集成。
- `pnpm: { yaml: false, sort: false }` 保留 pnpm 的 package.json 检查，关闭 pnpm 专属 YAML 集成与排序；普通 YAML 集成仍可能检查和格式化该文件。顶层 `yaml: false` 是 pnpm YAML 的默认值，显式 `pnpm.yaml` 优先；需要完全排除文件时使用 `ignores`。
- 其他 pnpm 字段应查阅当前安装的 antfu 版本，不要复制为本包私有类型。

仅在消费项目存在 `pnpm-workspace.yaml` 且确实需要显式控制时使用对象选项：

```ts
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

### 忽略行为

默认排除任意层级的 `.tmp` 临时目录和 `.codegraph` 生成索引，不需要在项目中重复配置。

正常情况下，antfu 原有的忽略列表会继续生效。本包只补充项目通用的生成物和资源路径，例如 `dist-*`、`*-dist`、Nitro 输出、`.wrangler`、`releases`、`backup` 与整个 `src-tauri`、快照和字体文件；不会忽略脚本、测试、CI 配置或仓库特有目录。

使用 `ignores` 追加仓库特有路径：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 将匹配路径排除在当前工具的扫描范围之外；glob 相对工具规定的配置根解析。
  ignores: ['generated/**', 'vendor/**'],
})
```

只有在消费方必须定义完整忽略结果时，才使用 `defaultIgnores: false`：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 控制是否保留共享工厂提供的默认忽略项；与 ignoreFiles 的项目追加项分开管理。
  defaultIgnores: false,
  // 将匹配路径排除在当前工具的扫描范围之外；glob 相对工具规定的配置根解析。
  ignores: ['node_modules/**', 'dist/**'],
})
```

`defaultIgnores: false` 将该入口的忽略结果交给消费方：`ignores` 数组直接作为结果，不再自动合入上游或本包默认列表；`ignores` 回调直接交给 antfu，不再注入本包列表。该开关不会关闭 antfu 独立的 `.gitignore` 集成，也不控制后续片段或 ESLint 自身的忽略行为。

设置 `defaultIgnores: [...]` 仅替换本包列表，仍保留 antfu 默认项。正常路径下，`ignores` 回调收到上游与本包合并后的列表，并自行决定最终结果；与 `defaultIgnores: false` 同用时，回调自行处理 antfu 传入的列表。

默认排除整个 `src-tauri`，以及 `.nuxt`、`.wrangler`、`releases` 和 `backup`；其他位置的 `target`、`gen` 不因此被忽略。

本包追加的默认规则在每次工厂调用时独立创建嵌套选项；修改一次返回结果不会污染下一次调用的本包默认规则。只隔离本包持有的数据，不克隆消费方输入或上游插件实现。

类型声明文件（`.d.ts`、`.d.mts`、`.d.cts`）保留上游对 `no-restricted-syntax` 的豁免，例如描述第三方 CommonJS 模块时必需的 `export =`；实现代码继承上游语法限制，本包仅将级别调整为 warn。

## 默认规则

导入路径可以省略后缀时就省略；必须保留时使用真实文件后缀。例如源码是 `module.ts`，不要写成不存在的 `module.js`。本包通过 `zzjtnb/import-extensions` 检查这种错误，真实 JavaScript 文件可以正常导入。NodeNext 项目的编译设置见[模块导入说明](https://lint.docs.zzjtnb.com/eslint/configuration#模块导入与源码扩展名)。

本包不重复实现 antfu 的排序逻辑。import / export 排序、package.json 排序、tsconfig 排序、pnpm workspace 排序和 perfectionist 排序都继续由 antfu 提供。

本包默认允许 ESM 顶层 `await`（`antfu/no-top-level-await: off`），消费方可按需开启限制。本包将 `no-console`、`no-undef`、`no-restricted-syntax`、`antfu/consistent-chaining`、`antfu/consistent-list-newline`、`antfu/curly`、`antfu/if-newline`、`antfu/top-level-function` 配置为 warn。Vue 规则沿用上游，Vue 无障碍和 antislop 默认开启。warn 不影响规则提供的自动修复能力。在 `rules` 中填写规则名和配置值即可覆盖默认设置。首参 `rules` 是高优先级全局覆盖，可能覆盖语言与声明文件豁免；只调整单个集成时，优先使用 `javascript.overrides`、`vue.overrides` 或 `imports.overrides` 等所属入口。

TOML 关闭 `toml/spaced-comment`，以保留 `#:schema <URL>` 指令；普通 JavaScript 的注释空格约定不因此关闭。

## 可用接口

本包提供一个运行时导出和四个类型导出：

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | 函数 | 生成 ESLint 配置，可直接用于 export default |
| `ESLintConfigOptions` | 类型 | 第一个工厂参数的类型，包括 `defaultIgnores` |
| `ESLintUserConfig` | 类型 | 工厂后续参数接收的 Flat Config 配置片段类型 |
| `ESLintPnpmOptions` | 类型 | antfu `pnpm` 对象选项类型 |
| `ESLintStylisticOptions` | 类型 | antfu `stylistic` 对象选项类型 |

本包没有默认运行时导出；请使用具名导入 `zzjtnb`。

## VS Code

将以下示例合并到消费项目的 `.vscode/settings.json`，保留已有设置。它关闭重复的保存格式化，并让 ESLint 在显式保存时修复；验证语言按项目实际使用的集成调整：

```jsonc
{
  // 停用 Prettier 扩展，格式规则由项目检查工具管理。
  "prettier.enable": false,
  // 不在保存时额外运行默认格式化器，由显式修复动作统一写回。
  "editor.formatOnSave": false,
  // 在保存时执行下列代码修复；各项使用 explicit 时只在手动保存生效。
  "editor.codeActionsOnSave": {
    // 手动保存时应用 ESLint 自动修复；explicit 不在自动保存时运行。
    "source.fixAll.eslint": "explicit",
    // 禁用编辑器单独整理导入，避免覆盖 ESLint 的导入排序约定。
    "source.organizeImports": "never",
  },
  // 只调整 ESLint 扩展中诊断的展示，不修改规则实际执行或自动修复能力。
  "eslint.rules.customizations": [
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "style/*",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "format/*",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-indent",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-spacing",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-spaces",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-order",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-dangle",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*-newline",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*quotes",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
    {
      // 通过规则名或 glob 选择要调整展示级别的诊断。
      "rule": "*semi",
      // 将当前诊断设置为指定级别；error 会影响工具的失败状态。
      "severity": "off",
      // 仅对可自动修复的诊断应用当前展示覆盖，不阻止实际修复。
      "fixable": true,
    },
  ],
  // 让 ESLint 扩展检查列出的编辑器语言模式；不在此列表的语言不由该扩展触发检查。
  "eslint.validate": ["javascript", "typescript", "vue", "json", "jsonc", "yaml", "toml"],
}
```

本包默认不启用 HTML formatter，只有项目明确启用对应集成后才把 `html` 加入 `eslint.validate`。Markdown 需要 ESLint 检查代码块还是交给 Markdownlint，也应先划分职责再配置编辑器。`eslint.rules.customizations` 只隐藏匹配规则的编辑器诊断并保留修复能力，不会关闭 CLI 中的对应规则。

## 脚本

```json
{
  "scripts": {
    "lint": "eslint . --cache --cache-location node_modules/.cache/.eslintcache",
    "format": "pnpm run lint --fix"
  }
}
```

### 脚本说明

以上包清单示例保持严格 JSON，字段说明列在此处，不向 package.json 插入注释。

| 字段 | 用途与生效条件 |
| --- | --- |
| `scripts` | 将命令声明为 pnpm run 入口；未声明的脚本不能通过 pnpm run 调用。 |
| `scripts.lint` | 执行对应检查范围；不加 --fix 时只报告问题，不写回文件。 |
| `scripts.format` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |

`--fix`、`--cache` 和 `--cache-location` 都是 ESLint CLI 选项。共享配置不会隐式开启文件写回或缓存。默认有 error 时命令失败，warn 不阻断。可选零警告策略及参数说明见 [CLI 检查与修复](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/docs/src/eslint/configuration.md#cli-检查与修复)。

## 官方参考

- [antfu/eslint-config 定制](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config 选项](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
