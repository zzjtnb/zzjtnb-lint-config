---
navigation:
  text: Markdownlint
  group: configuration
  order: 30
---

# Markdownlint 配置

`@zzjtnb/markdownlint-config` 使用带注释的 `index.jsonc` 维护共享规则，每项规则都附有用途和对应的官方文档链接。它没有运行时依赖，不接管项目的扫描范围或文件写回策略。

## 安装与接入

```bash
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

在项目根目录创建 `.markdownlint-cli2.jsonc`：

```jsonc
{
  // 读取项目 .gitignore，与下面的显式忽略项一起生效。
  "gitignore": true,
  // 不检查依赖目录和构建产物；项目专属路径可以继续追加。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 此对象只放 Markdownlint 规则；扫描及修复选项属于 CLI2 顶层。
  "config": {
    // 按已安装的 npm 包名继承共享规则。
    "extends": "@zzjtnb/markdownlint-config"
  }
}
```

JSONC 支持 `//` 和块注释。CLI2 与 VS Code 扩展会解析这些注释；也可以使用工具支持的 YAML 或 JavaScript 格式。共享配置选用 JSONC，以保留说明并使用原生 `extends`，无需增加私有工厂 API。

在 `package.json` 中添加检查和修复命令。以下示例未在 CLI2 配置中启用 `fix`，因此检查脚本不写回文件，修复脚本通过 `--fix` 请求自动修复：

```json
{
  "scripts": {
    "lint:markdownlint": "markdownlint-cli2 \"**/*.md\"",
    "format:markdownlint": "pnpm run lint:markdownlint --fix"
  }
}
```

CLI2 配置也能通过顶层 `fix` 控制写回，且配置值可覆盖命令行 `--fix` 提供的默认值。为保持检查与修复分离，不要在共用配置中固定 `fix: true` 或 `fix: false`；无法修复的问题仍需手动处理。

规则文件 `.markdownlint.jsonc` 可以直接在根对象设置 `extends`。`gitignore`、`ignores`、`customRules` 等字段只属于 CLI2 配置，不属于规则对象；完整契约见 [CLI2 官方配置文档][cli2-config]。

## 规则与覆盖

默认规则、取值及官方链接统一维护在包内 [`index.jsonc`][rules] 中；接入与自定义规则示例见[中文包说明][package-readme]。项目只需声明不同的部分：

```jsonc
{
  // 保留 Git 忽略规则。
  "gitignore": true,
  // 保留项目自己的检查范围，不由共享规则替项目决定。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 同名本地规则在继承之后生效。
  "config": {
    // 先加载共享默认值。
    "extends": "@zzjtnb/markdownlint-config",
    // MD013：重新启用行长度检查，常规行阈值为 120 个字符。
    "MD013": { "line_length": 120 },
    // MD033：只允许换行和折叠内容相关的 HTML 标签。
    "MD033": { "allowed_elements": ["br", "details", "summary"] }
  }
}
```

规则对象按 Markdownlint 原生继承语义整体覆盖，不对选项字段深度合并。`MD033` 的默认值仍为 `false`，只有项目显式传入上述对象时才限制 HTML 标签。

## 自定义规则和直接调用 API

`customRules` 位于 CLI2 顶层，用于加载本地规则模块或已安装的规则包；加载后在 `config` 中按规则名控制开关。完整示例和可运行的规则实现见[中文包说明][package-readme]。

Markdownlint 核心 `readConfig` 默认只使用 `JSON.parse`。直接调用核心 API 读取本包时，需传入 JSONC parser，例如 `readConfig(configPath, [jsoncParse])`，其中 `jsoncParse` 由 `markdownlint-cli2/parsers/jsonc` 导出。CLI2 和 VS Code 扩展会自动提供解析器；具体 API 示例也见包说明。

## VS Code 与已有项目迁移

安装 `DavidAnson.vscode-markdownlint` 后，扩展会复用项目的 `.markdownlint-cli2.jsonc`，无需再复制 `markdownlint.config` 规则表。该设置已被[扩展官方文档][vscode-config]标为弃用，项目文件的优先级高于全局设置。

编辑器只配置保存动作、格式化器等体验选项。包说明提供了逐项注释的设置示例：使用 `source.fixAll.markdownlint` 处理保存修复，单独将 Markdown 的 `editor.formatOnSave` 设为 `false`，避免再运行另一条保存格式化路径；手动格式化与粘贴格式化仍交给 Markdownlint。

同一目录已有 `.markdownlint.*` 规则文件时，它会覆盖 `.markdownlint-cli2.jsonc` 中的 `config`。迁移后共享规则没有生效时，先核对旧文件是否仍在提供另一套规则；同一规则只保留一处正文配置，CLI2 顶层继续维护扫描与执行选项。

`markdownlint.lintWorkspaceGlobs` 仅控制扩展的工作区检查命令，不替代 CLI2 的 globs 和 ignores。迁移时保留项目自己的扫描范围、自定义规则、生成目录和输出配置，只替换重复的规则核心。

ESLint 的 Markdown 集成还可能检查代码块；由 Markdownlint 独立负责文档时，可使用 `zzjtnb({ markdown: false })`。

## 默认约定速查

共享规则以 `default: true` 启用默认集合，再声明下面的差异。未列出的规则不是自动关闭；完整规则正文仍以包内 `index.jsonc` 为准。

| 规则 | 共享值 | 实际含义 |
| --- | --- | --- |
| MD001 | `false` | 不要求标题逐级递增 |
| MD003 | `{ "style": "atx" }` | 标题使用 `#` 形式 |
| MD013 | `false` | 不限制单行长度 |
| MD024 | `{ "siblings_only": true }` | 同父级标题不重复，不禁止跨章节复用小节名 |
| MD033 | `false` | 允许内联 HTML |
| MD041 | `false` | 不要求第一行必须是一级标题 |
| MD059 | `false` | 不限制 here 等链接文案 |
| MD060 | `false` | 不强制表格列视觉对齐；表格语法仍由其他规则检查 |

## 自定义规则完整接入

只修改规则选项不需要自定义模块。确有项目专属约束时，在 ESM 项目创建 `lint-rules/no-todo.js`：

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

在 CLI2 配置顶层加载模块，在规则对象中启用规则：

```jsonc
{
  "ignores": ["**/node_modules/**", "**/dist/**"],
  "customRules": ["./lint-rules/no-todo.js"],
  "config": {
    "extends": "@zzjtnb/markdownlint-config",
    "project-no-todo": true
  }
}
```

这个示例按原始行检查，包括代码块，每行只报告第一个标记，不提供自动修复。若文档本身要展示 TODO 示例，需要选择合适的语法节点或定义更精确的规则，不应通过全局忽略文档避开问题。

## 使用 API 检查内存文本

```js
import { createRequire } from 'node:module'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'

const configPath = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config')
const config = await readConfig(configPath, [jsoncParse])
const results = await lint({
  config,
  strings: { 'sample.md': '# 说明\n' },
})

console.log(results['sample.md'])
```

此处调用 CLI2 正式导出的 Markdownlint 子路径，不导入未声明的内部文件。API 调用不会使用 CLI2 的文件扫描流程；输入的 `strings` 已决定检查对象，消费方需自行管理输入大小和错误反馈。

## VitePress 文档的检查边界

将 `.vitepress/dist` 和 `.vitepress/cache` 放进项目忽略项，正文仍正常检查。YAML frontmatter、Markdown 标题和 Vue/HTML 扩展是否能构建，需要再由 VitePress 验证。

Markdownlint 不校验站内路由、锚点、图片文件，也不确认代码块能执行。文档站至少需要另外检查：正文链接与资源存在、导航指向有效页面、两种语言逐页对应，以及配置示例符合实际工具契约。

## 诊断与自动修复的使用顺序

1. 对一份实际文档运行 CLI，确认继承来源与扫描范围。
2. 阅读规则编号、行列和错误说明，区分内容问题与配置加载错误。
3. 用 `--fix` 写回工具支持的修改。
4. 复查差异，手动处理未修复项，再检查最终文本。
5. 对站点页面另做链接、渲染和构建验证，不把 Markdownlint 的零错误解释为站点完整可用。

## 相关文档

- [快速开始](./quick-start)
- [ESLint 配置](./eslint)
- [Stylelint 配置](./stylelint)

[rules]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint-config/index.jsonc
[package-readme]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint-config/README.zh-CN.md
[cli2-config]: https://github.com/DavidAnson/markdownlint-cli2/blob/v0.24.0/README.md#configuration
[vscode-config]: https://github.com/DavidAnson/vscode-markdownlint/blob/v0.62.1/README.md#configure
