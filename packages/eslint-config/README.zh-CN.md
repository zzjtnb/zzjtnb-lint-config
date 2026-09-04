# @zzjtnb/eslint-config

[![@zzjtnb/eslint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/eslint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>基于 @antfu/eslint-config 的 TypeScript、Vue 与 pnpm ESLint Flat Config</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="./README.md">English</a></p>

## 包的职责

`@zzjtnb/eslint-config` 是 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的轻量封装。

- parser、plugin、推荐规则和排序集成由 `@antfu/eslint-config` 负责。
- 本包启用仓库使用的语言和工具集成，并只追加文档中说明的规则覆盖。
- 本包不重新实现 antfu 的排序规则，也不重复安装 antfu 已管理的 parser 和 plugin。
- 本包另行注册 `shadcn` 插件，但不自动启用它的全部规则，也不因此忽略生成代码。
- 运行时唯一导出是异步配置工厂 `zzjtnb`。

工厂返回 ESLint Flat Config promise。第一个参数使用 antfu 的 options 模型，后续参数接收额外的 Flat Config 配置片段。

## 环境要求与安装

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.4.0` |

本包为 ESM-only。如果项目及其 ESLint 设置支持 TypeScript 配置，使用 `eslint.config.ts`；否则 ESM 项目使用 `eslint.config.js`，非 ESM 项目使用 `eslint.config.mjs`。

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

## TypeScript 7 与工具 API

TypeScript 7.0 不提供原有编译器 API，当前 typescript-eslint 仍需 TypeScript 6 API。使用微软官方兼容包与别名，使项目使用 TS7 的 `tsc`，工具仍通过 `typescript` 加载兼容 API：

```bash
pnpm add -D '@typescript/native@npm:typescript@7.0.2' 'typescript@npm:@typescript/typescript6@6.0.2'
pnpm exec tsc --version
pnpm exec tsc6 --version
```

`@typescript/native` 提供 TS7 的 `tsc`，`typescript` 别名提供 TS6 API 与 `tsc6`。Monorepo 使用 catalog 时在根集中声明对应版本，不让子包重新解析普通的 TS7 `typescript`。本配置不修改上游解析器，也不屏蔽其版本校验。Vue SFC、声明生成及其他使用编译器 API 的工具须分别验证。

参见 [TypeScript 官方双版本共存说明](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0)。

## 最小配置

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

直接调用时默认启用本仓库使用的 TypeScript、Vue、JSON / JSONC、YAML、TOML、Markdown、Node、perfectionist 和 stylistic 集成。pnpm 集成沿用 antfu 的默认行为，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用。UnoCSS 和外部 formatter 集成仍需显式开启。

## 完整配置

下面的配置保留语言默认值，显式展示常用集成开关，追加项目级忽略路径并覆盖规则与报告选项。pnpm 不在此强制启用，仍按是否存在 `pnpm-workspace.yaml` 自动判断；只需最小默认值时，直接使用 `zzjtnb()`。这些集成字段沿用 antfu，不是本包重新定义的私有选项。

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 传给 @antfu/eslint-config 的语言和文件格式集成。
  typescript: true,
  vue: true,
  jsonc: true,
  yaml: true,
  toml: true,
  markdown: true,
  node: true,

  // 保留 antfu 的 stylistic 规则；由其他 formatter 负责格式化时改为 false。
  stylistic: true,
  unocss: false,
  formatters: false,

  // 追加到 antfu 已解析的忽略列表之后。
  ignores: ['generated/**'],

  // 在全部共享默认规则之后应用，按规则名覆盖。
  rules: {
    'no-console': 'warn',
  },

  // ESLint 原生 Flat Config linter 选项。
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

需要追加另一个原生 Flat Config 配置片段时，将它放在第一个参数之后：

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  { stylistic: false },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
```

## 配置行为

第一个参数沿用 antfu 的全局 options 与单个 Flat Config 字段模型，并额外提供本包的 `defaultIgnores`。`files` 只能放在后续配置片段中，不能放进首个全局选项对象。后续输入支持配置对象、数组、异步结果及已有的 `FlatConfigComposer`，由 antfu 按原顺序展开追加。

| 输入 | 行为 |
| --- | --- |
| `typescript`、`vue`、`jsonc`、`yaml`、`toml`、`markdown`、`node`、`stylistic`、`unocss`、`formatters` 及其他 antfu 字段 | 原样传给 `@antfu/eslint-config`，不改名、不重新包装 |
| `pnpm` | 原样传给 antfu；本包另外关闭 `pnpm/yaml-enforce-settings`，避免 ESLint fix 写入 workspace 策略设置 |
| `rules` | 在全部共享默认规则之后应用；可覆盖 JavaScript、TypeScript、Vue、TOML 等集成的规则，后续 Flat Config 片段仍有更高优先级 |
| `linterOptions` | ESLint 原生报告选项，不额外限制文件范围；后续匹配的配置片段可覆盖 |
| `imports` | 沿用 antfu 的导入集成开关与对象选项；规则覆盖使用 `imports.overrides`，不使用 `overrides.imports` |
| `ignores` | 数组追加到默认忽略项之后；回调接收默认列表并决定最终结果 |
| `defaultIgnores` | 数组替换本包列表；`false` 同时接管该入口中的上游与本包默认列表，不关闭独立的 `.gitignore` 集成 |
| 后续 Flat Config 配置片段 | 传给 antfu，并由 ESLint 根据配置片段顺序处理优先级 |

消费方的选项名称和对象契约沿用 antfu。本包只在对应集成入口合入默认差异：本包默认值、消费方分组覆盖、对象内部 `overrides` 依次生效；跨语言顺序和声明文件豁免由上游保留，不把语言覆盖重新追加为全局规则。首参 `rules` 和后续 Flat Config 片段仍按约定拥有更高优先级。

### 格式化职责

本包默认启用 antfu 的 stylistic 规则。如果 Oxfmt、Prettier 或其他 formatter 是项目唯一的格式化工具，应在配置边界关闭 ESLint 格式化规则：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  stylistic: false,
})
```

`stylistic: false` 会关闭 stylistic 规则集；`stylistic: { semi: true }` 会保留规则集并只修改 `semi` 选项，两者不是同一行为。关闭 stylistic 不会关闭 import、JSON、YAML 等独立集成中的排序或其他自动修复；格式化工具迁移时仍需按实际冲突划分职责。

外部 formatter 集成与 stylistic 规则是两个独立开关。只有在安装了 antfu 版本所需的可选依赖后，才应显式开启：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  formatters: { css: true },
})
```

完整的 formatter 和 stylistic 选项请以当前安装版本的 [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) 及其定制文档为准。

### UnoCSS

UnoCSS 使用可选的上游集成，因此默认关闭。先安装当前 antfu 版本要求的依赖，再显式开启：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  unocss: true,
})
```

### pnpm workspace

`pnpm` 对象由 antfu 负责，因此它的字段、默认值、parser 注册和排序行为以当前安装的 antfu 版本为准。本包唯一的 pnpm 规则调整是关闭 `pnpm/yaml-enforce-settings`，防止 ESLint fix 静默向 `pnpm-workspace.yaml` 写入 `trustPolicy` 或 `shellEmulator` 等设置。

- 不设置 `pnpm` 时，antfu 仅在当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用该集成，npm 和 yarn 项目无需任何设置。
- `pnpm: true` 会强制启用该集成，要求存在 `pnpm-workspace.yaml`，否则检查 `package.json` 时 ESLint 会在加载 `pnpm/*` 规则时报错。
- `pnpm: false` 会关闭 antfu 的 pnpm 集成。
- `pnpm: { yaml: false, sort: false }` 保留 pnpm 的 package.json 检查，关闭 pnpm 专属 YAML 集成与排序；普通 YAML 集成仍可能检查和格式化该文件。顶层 `yaml: false` 是 pnpm YAML 的默认值，显式 `pnpm.yaml` 优先；需要完全排除文件时使用 `ignores`。
- 其他 pnpm 字段应查阅当前安装的 antfu 版本，不要复制为本包私有类型。

仅在消费项目存在 `pnpm-workspace.yaml` 且确实需要显式控制时使用对象选项：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  pnpm: { json: true, yaml: true, sort: true },
})
```

### 忽略行为

正常情况下，antfu 原有的忽略列表会继续生效。本包只补充项目通用的生成物和资源路径，例如 `dist-*`、`*-dist`、Nitro 输出、Tauri 的 `src-tauri/target` 与 `src-tauri/gen`、快照和字体文件；不会忽略脚本、测试、CI 配置或仓库特有目录。

使用 `ignores` 追加仓库特有路径：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  ignores: [
    'generated/**',
    'vendor/**',
  ],
})
```

只有在消费方必须定义完整忽略结果时，才使用 `defaultIgnores: false`：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  defaultIgnores: false,
  ignores: [
    'node_modules/**',
    'dist/**',
  ],
})
```

`defaultIgnores: false` 将该入口的忽略结果交给消费方：`ignores` 数组直接作为结果，不再自动合入上游或本包默认列表；`ignores` 回调直接交给 antfu，不再注入本包列表。该开关不会关闭 antfu 独立的 `.gitignore` 集成，也不控制后续片段或 ESLint 自身的忽略行为。

设置 `defaultIgnores: [...]` 仅替换本包列表，仍保留 antfu 默认项。正常路径下，`ignores` 回调收到上游与本包合并后的列表，并自行决定最终结果；与 `defaultIgnores: false` 同用时，回调自行处理 antfu 传入的列表。

Tauri 忽略只限定在 `src-tauri` 下的生成工程与构建产物，不扩大到所有 `target`、`gen`，也不忽略 `src-tauri/resources` 等手写资源。

本包追加的默认规则在每次工厂调用时独立创建嵌套选项；修改一次返回结果不会污染下一次调用的本包默认规则。只隔离本包持有的数据，不克隆消费方输入或上游插件实现。

类型声明文件（`.d.ts`、`.d.mts`、`.d.cts`）保留上游对 `no-restricted-syntax` 的豁免，例如描述第三方 CommonJS 模块时必需的 `export =`；实现代码仍采用本包的语法限制。

## 规则归属与作用域

本包不重复实现 antfu 的排序逻辑。import / export 排序、package.json 排序、tsconfig 排序、pnpm workspace 排序和 perfectionist 排序都继续由 antfu 提供。

本包只追加少量明确的规则覆盖，包括放宽链式调用、列表换行、控制流大括号和顶层函数约定，以及仓库的 `no-restricted-syntax` 和注释空格策略。完整规则映射属于已发布包的一部分，可通过 `rules` 字段覆盖。首参 `rules` 是高优先级全局覆盖，可能覆盖语言与声明文件豁免；只调整单个集成时，优先使用 `overrides.javascript`、`overrides.vue` 或 `imports.overrides` 等所属入口。

TOML 中的 `spaced-comment` 与 `toml/spaced-comment` 默认关闭，以保留 `#:schema <URL>` 指令；普通 JavaScript 的注释空格约定不因此关闭。

## 公共导出

本包提供一个运行时导出和四个类型导出：

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | 函数 | 创建 `Promise<Linter.Config[]>`，用于 ESLint Flat Config |
| `ESLintConfigOptions` | 类型 | 第一个工厂参数的类型，包括 `defaultIgnores` |
| `ESLintUserConfig` | 类型 | 工厂后续参数接收的 Flat Config 配置片段类型 |
| `ESLintPnpmOptions` | 类型 | antfu `pnpm` 对象选项类型 |
| `ESLintStylisticOptions` | 类型 | antfu `stylistic` 对象选项类型 |

本包没有默认运行时导出；请使用具名导入 `zzjtnb`。

## VS Code

将以下示例合并到消费项目的 `.vscode/settings.json`，保留已有设置。它关闭重复的保存格式化，并让 ESLint 在显式保存时修复；验证语言按项目实际使用的集成调整：

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off", "fixable": true },
    { "rule": "format/*", "severity": "off", "fixable": true },
    { "rule": "*-indent", "severity": "off", "fixable": true },
    { "rule": "*-spacing", "severity": "off", "fixable": true },
    { "rule": "*-spaces", "severity": "off", "fixable": true },
    { "rule": "*-order", "severity": "off", "fixable": true },
    { "rule": "*-dangle", "severity": "off", "fixable": true },
    { "rule": "*-newline", "severity": "off", "fixable": true },
    { "rule": "*quotes", "severity": "off", "fixable": true },
    { "rule": "*semi", "severity": "off", "fixable": true }
  ],
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue",
    "json",
    "jsonc",
    "yaml",
    "toml"
  ]
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

`--fix`、`--cache` 和 `--cache-location` 都是 ESLint CLI 选项。共享配置不会隐式开启文件写回或缓存。出现 warning 是否让命令失败取决于 CLI 策略；需要零警告时显式追加 `--max-warnings 0`。

## 官方参考

- [antfu/eslint-config 定制](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config 选项](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
