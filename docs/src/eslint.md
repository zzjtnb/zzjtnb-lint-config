---
navigation:
  text: ESLint
  group: configuration
  order: 10
---

# ESLint 配置

`@zzjtnb/eslint-config` 是基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 ESLint Flat Config 共享配置。它保留 antfu 的配置模型，通过具名 `zzjtnb` 工厂补充本项目的 TypeScript、Vue、pnpm 和规则约定。

## 安装与接入

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

在消费项目根目录创建 `eslint.config.ts`：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

工厂返回：

```ts
Promise<Linter.Config[]>
```

ESLint 会等待异步 Flat Config，配置文件可以直接导出工厂结果。本包使用具名导出，不提供 CommonJS 入口。

保存配置后，在项目根目录运行：

```bash
pnpm exec eslint . --config eslint.config.ts --max-warnings 0
```

需要写回可自动修复的问题时，在同一命令后追加 `--fix`。三个工具一起使用的脚本和编辑器设置见[快速开始](./quick-start)。

## TypeScript 7 消费项目

本配置的 TypeScript 规则由上游 typescript-eslint 执行。TS7 的编译命令和这些规则需要的编译器 API 属于不同边界；使用 TS7 时采用微软的双版本共存方式，不能仅把 `typescript` 指向不提供旧 API 的 TS7。可复制的安装命令集中维护于 [公开包消费说明](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint-config/README.zh-CN.md#typescript-7-与工具-api)。

仓库自身的 catalog、类型检查命令与批量升级策略见仓库内部文档 `apps/handbook/工程参考.md`，不把仓库开发依赖当作所有消费项目的要求。

## 工厂签名

概念上的函数签名如下：

```ts
async function zzjtnb(
  options?: ESLintConfigOptions,
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]>
```

第一个参数是选项对象，继承 `@antfu/eslint-config` 的 `OptionsConfig`，并增加本包的忽略项控制：

| 字段 | 所属 | 作用 |
| --- | --- | --- |
| `defaultIgnores` | 本包 | 控制本包追加的通用生成物忽略列表 |
| `ignores` | ESLint / antfu | 追加或接管忽略结果 |
| `rules` | ESLint / antfu | 在全部共享默认规则之后按规则名覆盖，后续 Flat Config 片段仍有更高优先级 |
| `linterOptions` | ESLint 原生 | 配置禁用注释和行内配置报告 |
| 其他 antfu 选项 | antfu | 原样传递给上游工厂 |

后续参数沿用 antfu 的配置输入，支持 Flat Config 对象、配置数组及其异步结果，也支持已有的 `FlatConfigComposer`；本包不额外包装或转换这些输入。它们在本包生成的默认片段之后追加。文件级 `files` 应放在后续片段中，不能放进首个全局选项对象：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    stylistic: false,
  },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
```

## 从已有配置模板迁移

共享默认值已包含 TypeScript、Vue、JSON / JSONC、YAML、TOML 和通用规则约定，消费项目不需要再复制整份 antfu 模板或重复注册相同的 parser、plugin。仅保留确实与共享值不同的选项、业务路径和文件级例外：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // 文档检查已交给 Markdownlint 时，按项目职责关闭 ESLint Markdown 集成。
    markdown: false,
    ignores: ['generated/**'],
    rules: { 'vue/require-default-prop': 'off' },
  },
  {
    // 生成器特有的约定只作用于生成目录，不扩大到手写源码。
    files: ['src/generated/**/*.ts'],
    rules: { 'symbol-description': 'off' },
  },
)
```

`shadcn` 插件的注册不会自动忽略所有生成代码，也不会全局放宽业务目录。其他框架、HTML formatter 和外部格式化器继续按对应集成选项显式开启，保留原工具所需的可选依赖。

共享配置仅关闭 `pnpm/yaml-enforce-settings`，避免修复器添加工作区策略；YAML 格式化与排序仍可能修改 `pnpm-workspace.yaml`。若项目要求该文件完全不参与检查，继续将它放在项目的 `ignores` 中；`pnpm: { yaml: false }` 只关闭 pnpm YAML 集成，不等于忽略文件。

默认差异通过 antfu 各集成的覆盖入口提供；分组覆盖与对象内部 `overrides` 的合并、跨语言的后置覆盖和声明文件豁免沿用上游。首参 `rules` 与后续 Flat Config 片段仍有更高优先级，不把语言分组设置在末尾重新应用到全部文件。

## 配置生成顺序

调用 `zzjtnb(options, ...configs)` 时，配置大致按以下顺序生成：

1. 本包为 antfu 各集成提供默认差异，再由上游合并消费方分组和对象内部的覆盖；
2. antfu 按自身顺序生成语言、parser、plugin、规则和文件级豁免；
3. 追加与根级 parser 同范围的 pnpm 工作区策略覆盖，以及 shadcn 插件注册；
4. 应用首参 `rules`；
5. 应用后续 Flat Config 片段。

因此，后续片段可以通过 ESLint 的正常配置优先级覆盖前面的规则。调用方只需要声明变化部分，不需要复制完整的共享配置。

## 默认集成

本包默认向 antfu 传递或启用以下能力：

- `typescript: true`；
- `vue: true`；
- `pnpm`，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 时启用（antfu 的默认行为）；
- antfu 当前版本提供的 JavaScript、JSON、JSONC、YAML、TOML、Markdown、Node.js、perfectionist 和 stylistic 集成。

上游可选集成不由本包隐式安装或猜测。UnoCSS 和外部 formatter 应按 antfu 当前版本要求安装依赖后显式开启。

### TypeScript

TypeScript parser 和 TypeScript 规则由 antfu 负责注册。本包不会重新声明 parser，也不会把上游的类型选项改名。

```ts
export default zzjtnb({
  typescript: true,
})
```

### Vue

Vue 默认开启。本包在 antfu 的 Vue 配置之后追加以下公开约定：

- Vue 组件名使用 PascalCase；
- Prop 名使用 camelCase；
- 模板属性使用 kebab-case；
- HTML 属性值使用双引号；
- 单文件组件按 `script`、`template`、`style` 顺序排列；
- 组件和空元素使用自闭合，普通 HTML 元素使用显式闭合标签；
- script 中声明的自定义事件名使用 camelCase；
- 模板中的 `v-on` 事件名使用 kebab-case；
- 组件事件需要显式声明；
- 不强制多单词组件名；
- 不重复检查由 antfu stylistic 负责的缩进和格式。

关闭 Vue：

```ts
export default zzjtnb({
  vue: false,
})
```

关闭后，antfu 不启用 Vue parser、插件和本包提供的 Vue 默认规则。

### pnpm workspace

pnpm 配置由 antfu 负责解析、排序和字段类型。不设置 `pnpm` 时，仅当当前目录或上级目录存在 `pnpm-workspace.yaml` 才启用该集成，npm 和 yarn 项目无需任何设置；`pnpm: true` 会强制启用，并要求存在该文件。集成启用时，本包仅追加一个 workspace 范围的覆盖：关闭 `pnpm/yaml-enforce-settings`，避免 ESLint 修复时自动向 `pnpm-workspace.yaml` 写入工作区策略设置。

```ts
export default zzjtnb({
  pnpm: false,
})
```

`pnpm: false` 会关闭 antfu 的 pnpm 集成，也不会追加本包的 pnpm 覆盖。对象形式的可用字段以当前安装的 antfu 版本为准：

```ts
export default zzjtnb({
  pnpm: {
    json: true,
    yaml: true,
    sort: true,
  },
})
```

YAML 是否启用遵循 antfu 的组装顺序：顶层 `yaml: false` 会关闭普通 YAML，并作为 pnpm YAML 的默认值；`pnpm.yaml` 的显式值优先。两处都关闭时，本包不追加匹配工作区 YAML 的规则片段。

## 本包的规则覆盖

本包不复制 antfu 的完整规则表，只声明与本项目约定不同的规则。默认覆盖如下：

| 规则 | 默认值 | 含义 |
| --- | --- | --- |
| `antfu/consistent-chaining` | `off` | 不额外限制链式调用换行 |
| `antfu/consistent-list-newline` | `off` | 不额外限制列表换行 |
| `antfu/curly` | `off` | 不强制控制流语句使用大括号 |
| `antfu/if-newline` | `off` | 不额外限制 `if` 条件换行 |
| `antfu/top-level-function` | `off` | 不额外限制顶层函数声明风格 |
| `antfu/no-import-dist` | `off` | 不禁止从 `dist` 目录导入 |
| `antfu/no-top-level-await` | `off` | 不禁止顶层 `await` |
| `no-console` | `off` | 不限制 `console` 使用 |
| `no-undef` | `off` | 不重复检查未定义变量 |
| `no-empty-function` | `off` | 允许保留空的生命周期回调或适配器函数 |
| `no-restricted-syntax` | `error` | 禁止调试语句、标签语句、`with`、`const enum` 和 TypeScript export assignment |
| `spaced-comment` | `error` | 注释标记与注释内容之间必须留空格 |
| `space-before-function-paren` | `off` | 函数括号空格交给 antfu stylistic 处理 |

上表中的注释空格规则有语言级例外：TOML 集成中，本包关闭 `spaced-comment` 与 `toml/spaced-comment`，保留编辑器可识别的 `#:schema <URL>` 指令，不让自动修复在 `#` 与 `:` 之间插入空格。普通 JavaScript 等文件的注释空格约定不受此例外影响。

声明文件（`.d.ts`、`.d.mts`、`.d.cts`）沿用上游豁免，不因合法的 `export =` 模块声明而报错。实现代码仍保留以下限制；消费方显式的全局 `rules` 可以覆盖该豁免。

`no-restricted-syntax` 的默认禁止项为：

```text
DebuggerStatement
LabeledStatement
WithStatement
TSEnumDeclaration[const=true]
TSExportAssignment
```

消费项目可以只覆盖需要改变的规则：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  rules: {
    'no-console': 'warn',
    'no-restricted-syntax': 'off',
  },
})
```

`rules` 会在本包默认规则之后应用，因此同名规则由消费项目的值生效。它是高优先级全局覆盖，也可能覆盖上游语言或声明文件豁免。只想调整某个集成时，优先保留其作用域：JavaScript、Vue 等使用 `overrides.javascript`、`overrides.vue`，导入规则使用 `imports.overrides`，不使用未声明的 `overrides.imports`。

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  overrides: {
    javascript: { 'no-console': 'warn' },
    vue: { 'vue/require-default-prop': 'off' },
  },
  imports: {
    overrides: { 'antfu/no-import-dist': 'error' },
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

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  linterOptions: {
    reportUnusedDisableDirectives: 'error',
    reportUnusedInlineConfigs: 'off',
  },
})
```

`--fix`、`--cache` 和 `--cache-location` 是 ESLint CLI 行为，不会因为使用共享配置而自动打开。

## 格式化职责

本包默认保留 antfu stylistic 规则。如果项目使用 Oxfmt、Prettier 或其他唯一格式化工具，应在项目配置边界关闭 stylistic：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  stylistic: false,
})
```

以下两种写法不同：

```ts
// 关闭 stylistic 规则集。
export default zzjtnb({ stylistic: false })

// 保留规则集，只调整 semi 选项。
export default zzjtnb({ stylistic: { semi: true } })
```

`formatters` 是 antfu 的独立可选集成，不等于 stylistic。当前 antfu 将 `eslint-plugin-format` 声明为可选 peer（`>=0.1.0`）；选择这个集成的消费项目应直接安装它：

```bash
pnpm add -D eslint-plugin-format
```

安装后添加下面的配置；未选择该集成时不需要安装此依赖：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  formatters: {
    css: true,
  },
})
```

只有在已经安装对应 formatter 依赖时才启用 `formatters`。如果 Stylelint、Oxfmt 或其他工具负责 CSS、SCSS、HTML、Markdown，应避免让 ESLint formatter 和它们同时写回同一文件。

## 忽略行为

正常情况下，忽略结果包含：

1. antfu 默认忽略项；
2. 本包通用忽略项；
3. 消费项目传入的 `ignores`。

本包通用忽略项包括：

```text
**/dist-*
**/*-dist
**/.nitro
**/src-tauri/target/**
**/src-tauri/gen/**
**/*.snap
**/*.ttf
**/*.woff
```

它们不会替消费项目忽略脚本、测试、CI 配置或项目特有目录。 Tauri 仅排除 `src-tauri/target` 与 `src-tauri/gen`，不排除整个 `src-tauri`，其中的手写资源仍会检查。

### 追加项目目录

```ts
export default zzjtnb({
  ignores: [
    'generated/**',
    'vendor/**',
  ],
})
```

### 完全接管通用忽略项

只有消费项目必须自己定义完整结果时，才设置 `defaultIgnores: false`：

```ts
export default zzjtnb({
  defaultIgnores: false,
  ignores: [
    'node_modules/**',
    'dist/**',
    'coverage/**',
  ],
})
```

对上面的数组输入，这会同时移除该入口中的 antfu 默认忽略项和本包通用忽略项，仅使用消费方数组；不是只停止追加本包列表。若 `ignores` 是回调，则直接交给 antfu，由回调决定是否保留其收到的上游列表，不再注入本包列表。该开关不会关闭 antfu 独立的 `.gitignore` 集成，也不控制后续片段或 ESLint 自身的忽略行为。

### 自定义 ignores 函数

需要基于上游忽略列表计算结果时，可以传函数：

```ts
export default zzjtnb({
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

## 公共类型和导出

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'
import type {
  ESLintConfigOptions,
  ESLintPnpmOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from '@zzjtnb/eslint-config'
```

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | runtime function | 创建异步 Flat Config |
| `ESLintConfigOptions` | type | 第一个参数的类型 |
| `ESLintUserConfig` | type | 后续 Flat Config 片段类型 |
| `ESLintPnpmOptions` | type | antfu `pnpm` 对象选项类型 |
| `ESLintStylisticOptions` | type | antfu `stylistic` 对象选项类型 |

本包没有 default runtime export。不要使用：

```ts
import config from '@zzjtnb/eslint-config'
```

## Config Inspector

Inspector 可查看实际配置项、规则来源、文件匹配范围和统计信息。本仓库通过 Playground 提供该工具，读取 `playground/eslint.config.ts` 及公开包入口，不读取消费项目的本地配置。启动、静态生成和构建产物前提见工作台 `playground/README.md`。

## VS Code

同时使用 ESLint 和 Stylelint 时，建议关闭重复的保存格式化，并让修复动作显式执行：

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue",
    "html",
    "json",
    "jsonc",
    "yaml",
    "toml"
  ]
}
```

如果 Stylelint 也负责 Vue、CSS 和 SCSS，再补充：

```json
{
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "stylelint.packageManager": "pnpm",
  "stylelint.validate": ["css", "scss", "vue", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "explicit"
  }
}
```

## 常见问题

### 配置包无法解析

确认：

- 项目使用 ESM 配置文件；
- `eslint` 已由消费项目直接安装；
- 配置文件位于项目根目录或通过 `--config` 明确指定；
- 包管理器安装的是当前版本，而不是旧的本地 link。

### 为什么规则没有作用于文件

Flat Config 按配置片段的 `files`、`ignores` 和顺序决定作用范围。追加片段时，检查它的 glob 是否匹配目标文件，并确认没有被前面的全局忽略项排除。

### 为什么 formatter 和 ESLint 互相修改

同一文件由多个格式化器同时负责会产生反复改写。选择一个格式化所有者；如果是 Oxfmt 或 Prettier，通常在共享配置边界设置 `stylistic: false`，并关闭 VS Code 的重复保存格式化。

### 为什么 pnpm workspace 被自动改写

关闭 `pnpm/yaml-enforce-settings` 只阻止该规则添加工作区策略，不会禁止其他规则格式化和排序 YAML。先查看实际诊断和差异；如果仍在添加策略设置，再检查后续片段是否重新启用了该规则。需要完全排除文件时使用项目的 `ignores`。

## 按真实文件检查最终配置

配置对象能加载，不等于目标文件命中了正确规则。针对实际路径查看合并结果：

```bash
pnpm exec eslint --print-config src/App.vue
pnpm exec eslint src/App.vue --config eslint.config.ts --max-warnings 0
```

`--print-config` 用于解释文件最终使用的 parser、插件和规则，不执行该文件的 lint。再运行第二条命令，才能观察真实诊断。换成 `.ts`、`.json`、`.yaml` 时应分别核对，不以 Vue 的配置结果代替其他文件。

### 全局规则与文件级例外如何选

- 整个项目都应改变的行为放首参 `rules`。
- 仅调整 Vue、JavaScript 等语言默认值时，使用对应集成的覆盖入口。
- 只对某个目录或文件类型改变时，放后续带 `files` 的 Flat Config 片段。
- 禁止把 `files` 塞进首个全局选项对象；该位置不是文件级片段。

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  { markdown: false },
  {
    files: ['scripts/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
  {
    files: ['src/**/*.vue'],
    rules: { 'vue/require-default-prop': 'error' },
  },
)
```

该示例不会给业务目录关闭 `no-console`，也不会把 Vue 专属规则应用到所有文件。规则范围应跟实际职责一致，不靠全局关闭来掩盖局部问题。

## TypeScript 规则不是完整类型检查

共享工厂启用 TypeScript 语法支持，不代表所有规则都启用了类型信息，也不代表检查器执行了项目编译。需要类型感知规则时，按当前 antfu 的正式 TypeScript 选项配置，并核对文件是否属于对应 TypeScript 项目；不要为每个普通配置文件强行启用项目级类型分析。

Vue 项目仍运行自己的 `vue-tsc`；非 Vue 的 TypeScript 项目运行自己的编译检查。ESLint 不会证明跨文件调用、泛型推断或 Vue 模板类型全部正确。

## Monorepo 中的调用位置

从根运行与从子包运行可能影响 workspace 发现、相对 glob 和配置加载。先选定一套执行边界，再为该边界维护配置，不依赖恰好能向上找到另一应用的依赖。

```bash
pnpm --filter @example/web exec eslint . --config eslint.config.ts
```

上述命令要求 `@example/web` 自己拥有配置和直接依赖；包名只是消费项目示例。若项目集中在根配置，则使用根目录的正式检查入口，不给每个应用再造一份同义配置。

## 警告、错误与修复成功不是一回事

`reportUnusedDisableDirectives` 默认报告 warning，但 `--max-warnings 0` 仍会使命令失败。`--fix` 只修复规则声明可自动修复的部分；剩余错误需要调整源码或有依据的局部配置。

排查时保留最初文件与诊断，按文件匹配、最终配置、规则含义、修复差异的顺序处理。不要通过增加 ignore 或关闭整套规则证明接入成功。

## 相关文档

- [快速开始](./quick-start)
- [Stylelint 配置](./stylelint)
- [Markdownlint 配置](./markdownlint)
