# @zzjtnb/markdownlint-config

[![@zzjtnb/markdownlint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/markdownlint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/markdownlint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/markdownlint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>基于原生 extends 的 Markdownlint 共享配置</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="./README.md">English</a></p>

## 包的职责

本包发布带逐项注释和官方规则链接的 `index.jsonc`，无运行时依赖，不需要构建。Markdownlint 按[原生配置契约][markdownlint-config]处理继承与规则覆盖，markdownlint-cli2 负责扫描范围、自定义规则模块和文件写回。

JSONC、YAML、JavaScript 等都是相关工具支持的配置形式，并非只能使用 JSON。本包选择 JSONC，便于直接维护注释，同时保留数据配置的原生 `extends` 接口，不额外导出工厂函数。

## 环境要求与安装

本文示例面向 Markdownlint `0.42.x` 和 markdownlint-cli2 `0.24.x`。CLI2 `0.24.x` 需要 Node.js `>=22`；这是执行工具的要求，本包没有单独声明 Node.js engines 或工具 peer dependency，共享 JSONC 自身也不依赖 Node.js API。其他版本组合应按实际规则和解析能力核对，不能把 JSONC 可读取当成所有规则兼容。

```bash
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

## 最小配置

在项目根目录创建 `.markdownlint-cli2.jsonc`。字段的完整契约见 [CLI2 配置文档][cli2-config]：

```jsonc
{
  // 读取项目 .gitignore，与下面显式声明的忽略项共同生效。
  "gitignore": true,
  // 排除依赖和构建产物；项目生成目录可继续追加。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // Markdownlint 规则对象；扫描范围等 CLI2 字段放在此对象之外。
  "config": {
    // 按 npm 包名加载已安装的共享规则，下面可继续添加本地覆盖。
    "extends": "@zzjtnb/markdownlint-config"
  }
}
```

CLI2 和 VS Code 的 Markdownlint 扩展均可读取此配置。使用 `.markdownlint.jsonc` 等规则配置文件时，可直接在根对象声明 `extends`；不要把 `gitignore`、`ignores` 或 `customRules` 放进规则对象。

同目录已有 `.markdownlint.*` 规则文件时，它会覆盖 CLI2 配置中的 `config`。迁移后规则未生效时，先核对旧文件是否仍提供另一套规则；不要在两处分别维护共享规则与本地覆盖。

## 完整配置与自定义

```jsonc
{
  // 使用 Git 忽略规则，补充下方的项目专属忽略项。
  "gitignore": true,
  // 检查范围属于消费项目；这里额外排除自动生成的文档。
  "ignores": ["**/node_modules/**", "**/dist/**", "docs/generated/**"],
  // 加载项目自己的规则；本地路径相对于当前配置文件，也支持已安装的规则包名。
  "customRules": ["./lint-rules/no-todo.js"],
  // 先继承共享规则，再按规则名应用本地覆盖。
  "config": {
    // 共享包的 JSONC 入口由 Markdownlint 原生解析。
    "extends": "@zzjtnb/markdownlint-config",
    // MD013：重新启用行长度检查；line_length 是常规行长度阈值，单位为字符。
    "MD013": { "line_length": 120 },
    // MD024：false 表示在整个文档范围检查重复标题，而非仅检查同父级标题。
    "MD024": { "siblings_only": false },
    // MD033：仅允许换行和折叠内容相关标签，覆盖共享的“允许全部 HTML”。
    "MD033": { "allowed_elements": ["br", "details", "summary"] },
    // 自定义规则需要先由上方 customRules 加载，随后才能按名称控制开关。
    "project-no-todo": true
  }
}
```

规则的默认值、用途及官方选项说明统一维护于随包发布的 [`index.jsonc`][rules]。仅覆盖内置规则时，移除示例中的 `customRules` 和 `project-no-todo` 即可，不必创建规则文件。

上例的 `lint-rules/no-todo.js` 在 ESM 项目中可以写为：

```js
export default {
  names: ['project-no-todo'],
  description: '文档不允许保留 TODO: 标记',
  tags: ['project'],
  parser: 'none',
  function(params, onError) {
    params.lines.forEach((line, index) => {
      const column = line.indexOf('TODO:')
      if (column !== -1) {
        onError({
          lineNumber: index + 1,
          detail: '请完成或移除 TODO 标记',
          range: [column + 1, 5],
        })
      }
    })
  },
}
```

该规则按原始文本检查，包括代码块，每行报告第一个 `TODO:` 标记。区分语法节点时，应按[自定义规则契约][custom-rules]选择 `micromark` parser。非 ESM 项目可将规则文件改为 `.mjs`，并同步修改 `customRules` 路径。

## 默认规则与合并行为

默认启用 Markdownlint 规则，逐项调整、用途及官方规则链接见 [`index.jsonc`][rules]。

`extends` 先加载共享规则，再应用本地同名值；规则选项对象整体替换，不进行字段级深度合并。自定义规则实现必须由消费方通过 `customRules` 加载，不会自动包含在共享 JSONC 中。

## VS Code 接入

安装 `DavidAnson.vscode-markdownlint` 扩展。扩展会读取项目的 `.markdownlint-cli2.jsonc`，无需在 `settings.json` 中再复制一份规则。

将以下字段合并到 `.vscode/settings.json`，保留已有的 ESLint、Stylelint 等保存动作：

```jsonc
{
  // 保存动作只管理何时修复，规则仍来自项目的 CLI2 配置文件。
  "editor.codeActionsOnSave": {
    // always 同时覆盖显式保存与自动保存。
    "source.fixAll.markdownlint": "always"
  },
  // 只调整 Markdown，不影响其他语言的格式化器。
  "[markdown]": {
    // 为手动格式化和粘贴格式化指定 Markdownlint。
    "editor.defaultFormatter": "DavidAnson.vscode-markdownlint",
    // 保存时已经由 fixAll 修复，关闭另一条格式化路径，避免重复处理。
    "editor.formatOnSave": false,
    // 粘贴时使用上面指定的格式化器。
    "editor.formatOnPaste": true
  }
}
```

[扩展配置文档][vscode-config]已将 `markdownlint.config` 标为弃用。项目配置的优先级高于全局设置；规则应以项目文件为准。`markdownlint.lintWorkspaceGlobs` 只控制扩展的工作区检查命令，不能代替 CLI2 的扫描参数和忽略项。

## 直接调用 Markdownlint API

Markdownlint 核心 `readConfig` 默认使用 `JSON.parse`。直接读取带注释的配置时，需要显式传入 JSONC parser；CLI2 和 VS Code 扩展会自行提供：

```js
import { createRequire } from 'node:module'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'

const configPath = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config')
const config = await readConfig(configPath, [jsoncParse])
const results = await lint({ config, strings: { 'sample.md': '# 说明\n' } })
```

## 命令与迁移

```bash
# 检查，不请求写回。
pnpm exec markdownlint-cli2 --config .markdownlint-cli2.jsonc "**/*.md"

# 请求自动修复，剩余问题仍需手动处理。
pnpm exec markdownlint-cli2 --config .markdownlint-cli2.jsonc --fix "**/*.md"
```

也可以保存为项目脚本，复用同一份扫描参数：

```json
{
  "scripts": {
    "lint:markdownlint": "markdownlint-cli2 --config .markdownlint-cli2.jsonc \"**/*.md\"",
    "format:markdownlint": "pnpm run lint:markdownlint --fix"
  }
}
```

CLI2 顶层 `fix` 也能启用或禁止写回，并可覆盖 `--fix` 提供的默认值。为保持检查与修复分离，不在共用 CLI2 配置中固定 `fix: true` 或 `fix: false`。

共享包不隐式开启自动修复。迁移已有项目时，保留 `gitignore`、`ignores`、`globs`、自定义规则和输出配置，只将重复的规则核心替换为 `config.extends`。

Markdownlint 负责文档规则，ESLint 的 Markdown 集成还可能检查代码块。若文档完全交给 Markdownlint，可在 ESLint 中设置 `zzjtnb({ markdown: false })`；这也会关闭 ESLint 的 Markdown 代码块检查，Markdownlint 不会补上该能力。

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE)。

[markdownlint-config]: https://github.com/DavidAnson/markdownlint/blob/v0.42.0/README.md#configuration
[cli2-config]: https://github.com/DavidAnson/markdownlint-cli2/blob/v0.24.0/README.md#configuration
[custom-rules]: https://github.com/DavidAnson/markdownlint/blob/v0.42.0/doc/CustomRules.md
[vscode-config]: https://github.com/DavidAnson/vscode-markdownlint/blob/v0.62.1/README.md#configure
[rules]: ./index.jsonc
