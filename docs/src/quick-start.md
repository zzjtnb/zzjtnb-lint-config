---
navigation:
  text: 快速开始
  group: start
  order: 10
---

# 快速开始

本项目提供三个可独立安装的 npm 公开包：

- `@zzjtnb/eslint-config`：ESLint 10 Flat Config；
- `@zzjtnb/stylelint-config`：Stylelint 17 对象式 Config；
- `@zzjtnb/markdownlint-config`：通过原生 `extends` 加载的 Markdownlint JSONC 规则。

ESLint 与 Stylelint 使用具名 `zzjtnb` 工厂，Markdownlint 使用原生配置继承。三个包没有相互依赖，可以按项目需要选用。

## 公开包消费要求

ESLint 和 Stylelint 配置包的环境要求如下：

| 使用范围 | 要求 |
| --- | --- |
| ESLint 配置包的 Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| Stylelint 配置包的 Node.js | `^22.12.0 \|\| >=24` |
| ESLint 配置包的 peer dependency | ESLint `^10.13.0` |
| Stylelint 配置包的 peer dependency | Stylelint `^17.16.0` |
| 包管理器 | 支持 npm、pnpm 等包管理器，本文使用 pnpm |

ESLint 与 Stylelint 包是 ESM-only，不提供 CommonJS 入口。对应配置文件使用 ESM `import` / `export`；默认使用 `eslint.config.js` 和 `stylelint.config.js`，项目需声明 `"type": "module"`。Markdownlint 包提供带注释的 JSONC，使用 CLI2 `0.24.x` 时需要 Node.js `>=22`。

## 安装

按需选择一种安装组合。本教程统一使用 pnpm；仅安装实际需要的组合。

### 只安装 ESLint

```bash
# 安装 ESLint 工具与共享配置。
pnpm add -D eslint @zzjtnb/eslint-config
```

接着按下方[配置 ESLint](#配置-eslint)创建配置；完整选项与覆盖示例见 [ESLint 配置](./eslint)。

### 只安装 Stylelint

```bash
# 安装 Stylelint 工具与共享配置。
pnpm add -D stylelint @zzjtnb/stylelint-config
```

接着按下方[配置 Stylelint](#配置-stylelint)创建配置；语法支持与覆盖示例见 [Stylelint 配置](./stylelint)。

### 只安装 Markdownlint

```bash
# 安装 Markdownlint 工具与共享配置。
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

安装后按下方[配置 Markdownlint](#配置-markdownlint)创建配置文件；规则覆盖、自定义规则及编辑器接入示例见 [Markdownlint 配置](./markdownlint)。

### 同时安装三个工具

```bash
# 安装三个检查工具及其共享配置。
pnpm add -D eslint stylelint markdownlint-cli2 @zzjtnb/eslint-config @zzjtnb/stylelint-config @zzjtnb/markdownlint-config
```

`eslint` 和 `stylelint` 是对应公开包的 peer dependency，必须由消费项目直接安装。共享 preset、parser、插件和 PostCSS 实现依赖由公开包自身声明和管理，不需要把它们的内部依赖复制到消费项目。

## 配置 ESLint

在项目根目录创建 `eslint.config.js`：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

`zzjtnb()` 返回 `Promise<Linter.Config[]>`。ESLint 会等待异步配置结果，配置文件不需要自行包一层 `async`。

默认组合包括：

- TypeScript；
- Vue；
- JSON / JSONC；
- YAML；
- TOML；
- Markdown；
- Node.js；
- pnpm workspace（当前目录或上级目录存在 `pnpm-workspace.yaml` 时由 antfu 默认启用）；
- perfectionist 排序；
- antfu stylistic 规则。

本包已提供 UnoCSS、Vue 无障碍、外部 formatter、antislop 的插件依赖，不需要消费项目重复安装；Vue 无障碍和 antislop 默认开启，UnoCSS、外部 formatter 按 antfu 选项显式启用。依赖、默认状态与完整开启示例见[按需扩展](/eslint/presets#按需扩展)。shadcn 已默认注册，但不会自动开启全部规则。

## 配置 Stylelint

在项目根目录创建 `stylelint.config.js`，按需要选择工厂调用或原生继承，不要同时复制两套配置：

::: code-group

```js [stylelint.config.js（工厂）]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

```js [stylelint.config.js（原生继承）]
export default {
  extends: ['@zzjtnb/stylelint-config'],
}
```

:::

`zzjtnb()` 工厂支持按调用顺序合并多个配置片段；原生 `extends` 同样支持在本地对象中添加 `rules`、`ignoreFiles` 和 `overrides`，但使用 Stylelint 自身的继承语义。两种方式的覆盖顺序不要混为一谈，详见 [Stylelint 配置](./stylelint)。

默认 Stylelint 作用域包括：

| 文件 | 解析方式 | 主要能力 |
| --- | --- | --- |
| `*.css` | Stylelint 默认 CSS 语法 | CSS 标准规则和属性顺序 |
| `*.scss` | `postcss-scss` | CSS、SCSS 和属性顺序规则 |
| `*.vue` | `postcss-html` | Vue SFC 中的 CSS / SCSS |
| `*.html`、`*.htm` | `postcss-html` | HTML 容器中的样式 |

## 配置 Markdownlint

默认推荐 MJS，也可选择 JSONC，不要同时保留两份 CLI2 配置。MJS 继承共享扫描默认值与规则；JSONC 仅继承规则，扫描选项自行声明。具体格式与覆盖说明见 [Markdownlint 快速开始](/markdownlint#使用默认预设)。

::: code-group

```js [.markdownlint-cli2.mjs（共享扫描与规则）]
// /config 提供共享扫描选项，并继承包根入口的 JSONC 规则。
export { default } from '@zzjtnb/markdownlint-config/config'
```

```jsonc [.markdownlint-cli2.jsonc（仅继承规则）]
{
  // 读取项目的 Git 忽略声明。
  "gitignore": true,
  // JSONC 不继承 /config 的扫描选项，此处仅示例排除依赖和构建产物。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 继承共享规则，消费方按规则名追加覆盖。
  "config": {
    "extends": "@zzjtnb/markdownlint-config",
  },
}
```

:::

保存一份待检查的 `README.md`，例如：

````md
# 项目说明

## 使用方式

```bash
pnpm install
```

- 安装依赖。
- 运行项目。
````

在同一项目根目录检查文档，或显式执行自动修复：

```bash
# 只检查，不写回文件。
pnpm exec markdownlint-cli2 "**/*.md"

# 将可自动修复的问题写回文件，其余问题仍需手动处理。
pnpm exec markdownlint-cli2 --fix "**/*.md"
```

配置继承、规则覆盖及项目自定义规则的完整示例见 [Markdownlint 配置](./markdownlint)。

## 推荐的 package scripts

下面的脚本同时使用 ESLint、Stylelint 和 Markdownlint。检查命令不写回文件，格式化命令复用检查脚本并追加 `--fix`：

```json [package.json]
{
  "type": "module",
  "scripts": {
    "lint:eslint": "eslint . --config eslint.config.js",
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.js",
    "lint:markdownlint": "markdownlint-cli2 \"**/*.md\"",
    "lint": "pnpm run lint:eslint && pnpm run lint:stylelint && pnpm run lint:markdownlint",
    "format:eslint": "pnpm run lint:eslint --fix",
    "format:stylelint": "pnpm run lint:stylelint --fix",
    "format:markdownlint": "pnpm run lint:markdownlint --fix",
    "format": "pnpm run format:eslint && pnpm run format:stylelint && pnpm run format:markdownlint"
  }
}
```

### package.json 字段说明

上面的 package.json 示例使用严格 JSON，各字段用途如下：

| 字段 | 用途与生效条件 |
| --- | --- |
| `type` | module 使 `.js` 配置按 ESM 加载；不声明时须使用 `.mjs`。 |
| `scripts` | 将命令声明为 pnpm run 入口；未声明的脚本不能通过 pnpm run 调用。 |
| `scripts.lint:eslint` | 检查当前目录中 ESLint 支持且未被忽略的文件，使用显式指定的配置。 |
| `scripts.lint:stylelint` | 检查 glob 选中的 CSS、SCSS、Vue 与 HTML 样式。 |
| `scripts.lint:markdownlint` | 读取项目 CLI2 配置，检查匹配且未被忽略的 Markdown 文件。 |
| `scripts.lint` | 顺序执行三个检查入口；前一命令失败时停止，不执行后续命令。 |
| `scripts.format:eslint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |
| `scripts.format:stylelint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |
| `scripts.format:markdownlint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |
| `scripts.format` | 顺序执行三个修复入口；前一命令失败时停止，已写回的修改保留。 |

ESLint 示例脚本沿用默认退出策略：error 导致失败，warn 不导致失败。可选的零警告策略见 [CLI 检查与修复](/eslint/configuration#cli-检查与修复)。

ESLint 的 `.` 只表示消费项目根目录下由 ESLint 支持的文件；Stylelint 应使用样式文件 glob，避免把 TypeScript、JSON 和 Markdown 交给 Stylelint。若项目还有 `.htm` 文件，将示例中的 glob 扩展为 `**/*.{css,scss,vue,html,htm}`。

这些脚本属于安装共享包的消费项目，不是三个公开包自身的脚本。只使用其中一个或两个工具时，保留相应的检查和修复脚本，并同步调整 `lint`、`format` 的调用列表，不运行尚未安装的工具。

三个工具一起使用时，在 `eslint.config.js` 中设置 `markdown: false`，将文档规则交给 Markdownlint。该设置也会关闭 ESLint 的 Markdown 代码块检查，Markdownlint 不会补上这项能力；项目仍需检查代码块时，不要直接采用此设置，应另行明确两个工具的检查职责。Markdownlint 的扫描范围和排除项由 `.markdownlint-cli2.mjs` 维护。

运行检查：

```bash
# 运行当前项目已配置的代码、样式和文档检查，不自动修复。
pnpm run lint
```

运行自动修复：

```bash
# 按当前项目配置自动修复代码、样式与文档，会写回文件。
pnpm run format
```

共享配置不会自动打开 `--fix`、缓存或文件写回。是否修复、是否缓存由消费项目自己的 CLI 参数或本地配置决定。

## 一个完整的项目示例

沿用上方安装命令和 `package.json` scripts，`.markdownlint-cli2.mjs` 与 `README.md` 使用[配置 Markdownlint](#配置-markdownlint)中的示例。下面只展示 ESLint、Stylelint 的项目级覆盖，不重复维护同一份 Markdown 配置。

```text
lint-project/
├── .markdownlint-cli2.mjs
├── README.md
├── eslint.config.js
├── package.json
├── src/
│   ├── App.vue
│   ├── index.ts
│   ├── index.css
│   └── theme.scss
└── stylelint.config.js
```

`eslint.config.js`：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // antfu 的选项会原样传递。
  typescript: true,
  // 配置 Vue 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  vue: true,
  // 配置 YAML 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
  yaml: true,
  // Markdown 文档由 Markdownlint 负责，避免重复检查与修复。
  markdown: false,

  // 项目特有目录追加到默认忽略项之后。
  ignores: ['generated/**'],

  // 消费方只覆盖需要改变的规则。
  rules: {
    // 覆盖 console 使用限制，实际诊断级别由当前规则值决定。
    'no-console': 'warn',
  },
})
```

`stylelint.config.js`：

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 追加需要忽略的样式文件路径，保留共享工厂默认的忽略语义。
  ignoreFiles: ['**/generated/**'],
  // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
  rules: {
    // 按配置的正则限制类选择器命名；不会影响其他选择器类型。
    'selector-class-pattern': null,
  },
  // 按所属配置分组或文件范围覆盖已有选项，保留未列出的默认规则。
  overrides: [
    {
      // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
      files: ['legacy/**/*.vue'],
      // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
      rules: {
        // 控制 SCSS 运算符后的换行约定；null 表示关闭该规则。
        'scss/operator-no-newline-after': null,
      },
    },
  ],
})
```

## 验证顺序

遇到首次接入问题时，先确认已按本页保存所选工具的配置文件和 scripts，再执行对应检查；未使用的工具可以跳过：

```bash
# 确认依赖和 lockfile 已安装。
pnpm install

# 先检查 ESLint 配置是否可以加载。
pnpm run lint:eslint

# 再检查 Stylelint 配置和样式 glob。
pnpm run lint:stylelint

# 检查 Markdownlint 配置继承与 Markdown 扫描排除范围。
pnpm run lint:markdownlint

# 项目已有对应脚本时，再执行类型检查或构建。
pnpm run typecheck
# 构建当前项目的生产产物。
pnpm run build
```

如果报配置包无法解析，先核对依赖是否安装在当前消费项目、包名和配置入口是否正确。Stylelint 的 `Unknown rule` 表示规则名未被识别，应核对规则是否属于当前版本及其插件是否由匹配的配置注册；样式解析错误则另行检查文件扩展名、样式语言与 `customSyntax` 的匹配，不把这两类错误混为一谈。

## 编辑器配置

同时使用 ESLint、Stylelint 和 Markdownlint 三个扩展时，建议关闭 VS Code 内置 CSS 校验和自动保存格式化，把修复动作交给对应工具：

```jsonc [.vscode/settings.json]
{
  // 停用 Prettier 扩展，格式规则由项目检查工具管理。
  "prettier.enable": false,
  // 不在保存时额外运行默认格式化器，由显式修复动作统一写回。
  "editor.formatOnSave": false,
  // 停用内置 CSS 校验，避免与 Stylelint 重复报告。
  "css.validate": false,
  // 关闭编辑器内置 SCSS 校验，避免与 Stylelint 重复报告。
  "scss.validate": false,
  // 停用内置 Less 校验，避免与 Stylelint 重复报告。
  "less.validate": false,
  // Stylelint 扩展使用 pnpm 解析项目依赖。
  "stylelint.packageManager": "pnpm",
  // 让 Stylelint 扩展检查列出的样式与模板语言。
  "stylelint.validate": ["css", "scss", "vue", "html"],
  // 在保存时执行下列代码修复；各项使用 explicit 时只在手动保存生效。
  "editor.codeActionsOnSave": {
    // 手动保存时应用 ESLint 自动修复；explicit 不在自动保存时运行。
    "source.fixAll.eslint": "explicit",
    // 手动保存时应用 Stylelint 自动修复；explicit 不在自动保存时运行。
    "source.fixAll.stylelint": "explicit",
    // 仅在手动保存时应用 Markdownlint 自动修复，不在自动保存时运行。
    "source.fixAll.markdownlint": "explicit",
    // 禁用编辑器单独整理导入，避免覆盖 ESLint 的导入排序约定。
    "source.organizeImports": "never",
  },
}
```

更完整的选项、规则覆盖和默认行为请参阅 [ESLint 配置](./eslint)、[Stylelint 配置](./stylelint)与 [Markdownlint 配置](./markdownlint)。

## 先确定工具边界

三个包共享的是规则，不是执行引擎。可以把它们理解为三份专业检查清单，ESLint、Stylelint 和 markdownlint-cli2 才是实际执行检查的人。

| 目标 | 使用工具 | 不能替代的检查 |
| --- | --- | --- |
| TypeScript / JavaScript 及 Vue 脚本、模板 | ESLint | 不能代替 `tsc`、`vue-tsc` 的完整类型检查 |
| CSS / SCSS 及 Vue 样式块 | Stylelint | 不能证明浏览器布局正确，也不能验证框架编译产物 |
| Markdown 正文与排版 | markdownlint-cli2 | 不检查链接目标是否存在，也不执行围栏中的代码 |
| 依赖版本和解析一致性 | pnpm 清单与锁文件 | lint 成功不代表 peer 范围均已兼容 |

Vue SFC 同时交给 ESLint 和 Stylelint 是正常分工：前者检查脚本和模板，后者检查样式；不要因为文件扩展名相同，就把其中一项删掉。

## ESM 配置与 TypeScript 源码

消费项目的 `package.json` 声明 `"type": "module"` 后，`eslint.config.js` 和 `stylelint.config.js` 按 ESM 加载。未声明 ESM 的项目可以使用对应的 `.mjs` 文件，不要同时放置多份同类配置。

工具配置使用 JavaScript，不影响检查 `.ts`、`.tsx` 或 Vue 脚本；业务源码的类型检查仍由项目自己的 `tsc`、`vue-tsc` 等工具负责。消费项目直接按公开包名导入共享配置，不需要导入配置包的 `src`，也不需要修改业务项目的 tsconfig 来加载这些 JS 配置。

## 首次接入的验收样本

不要只运行一次没有匹配文件的命令。至少保存一份实际 TypeScript 文件、一份包含样式的 Vue 或 CSS 文件，以及一份 Markdown，然后分别检查这些明确的文件。

```bash
# 检查指定 JavaScript、TypeScript 或 Vue 文件。
pnpm exec eslint src/main.ts --config eslint.config.js
# 检查指定样式文件，按实际配置解析 CSS、SCSS 或 Vue。
pnpm exec stylelint src/App.vue --config stylelint.config.js
# 检查指定 Markdown 文件，使用命令中的配置或 CLI2 自动发现配置。
pnpm exec markdownlint-cli2 README.md
```

把路径换成项目真实存在的文件。验收时确认：工具实际读取了文件、规则来源正确、问题定位可用、修复后剩余诊断真实保留。不要用 `allowEmptyInput`、空 glob 或忽略整个源码目录来让检查通过。

## CI 与本地修复的区别

本地 `format` 会写回源文件，适合开发时处理可修复问题；CI 使用 `lint` 检查既有提交，不在流水线中悄悄改文件。

```bash
# 严格按锁文件安装依赖，清单与锁文件不一致时失败。
pnpm install --frozen-lockfile
# 运行当前项目已配置的代码、样式和文档检查，不自动修复。
pnpm run lint
```

缓存只是减少重复检查，不是跳过检查的依据。工具版本、配置或依赖变化后结果异常时，先对目标文件禁用缓存重查，再定位配置加载和文件范围；不要先删除整个锁文件。

## 首次接入失败排查表

| 现象 | 先核对什么 | 下一步 |
| --- | --- | --- |
| 找不到配置包 | 当前工作区是否直接声明并安装该包 | 用 `pnpm why` 核对解析来源 |
| TypeScript parser 拒绝版本 | `typescript` 实际提供的 API 版本 | 核对所安装配置包及其工具链的依赖声明，参见[依赖版本管理](/dependencies)；不屏蔽版本校验 |
| 样式命令成功但没有诊断 | glob、CWD、ignoreFiles、实际文件类型 | 显式传入一个已知有问题的样式文件 |
| 编辑器与 CLI 不同 | 编辑器工作目录、插件版本与项目配置 | 先让项目根 CLI 通过，再核对编辑器日志 |
| 每次保存反复改回 | 是否有多个 formatter 同时负责同一内容 | 保留一个格式化所有者与明确的保存动作 |
| Markdown 继承不生效 | 同目录是否还有 `.markdownlint.*` | 收敛规则来源，不重复维护两份规则 |

## 下一步

- [ESLint 配置](./eslint)：查看 Flat Config 工厂、选项转发、规则覆盖和忽略行为。
- [Stylelint 配置](./stylelint)：查看原生 Config 字段、语法作用域、合并策略和 CLI。
- [Markdownlint 配置](./markdownlint)：查看配置继承、扫描排除范围和 CLI 用法。
