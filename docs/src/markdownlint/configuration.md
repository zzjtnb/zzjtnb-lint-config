---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 详细配置
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: markdownlint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 30
---

# Markdownlint 详细配置

本页说明如何修改规则、选择检查文件和排查配置问题。默认接入见[快速开始](/markdownlint)，配置来源见[配置来源](/markdownlint/upstream)，默认差异见[本项目预设](/markdownlint/presets)。

## 完整配置示例

本包没有工厂函数。根入口提供 JSONC 规则，`/config` 提供 CLI2 扫描配置；按以下方式展开默认值，再声明项目差异。没有覆盖需求时直接重新导出共享配置即可，见[快速开始](/markdownlint)。

```js [.markdownlint-cli2.mjs]
import shared from '@zzjtnb/markdownlint-config/config'

export default {
  // 保留共享扫描选项和规则继承，不复制默认列表。
  ...shared,
  // 本包默认 true，读取消费项目的 Git 忽略文件。
  gitignore: true,
  // 默认由命令行提供；本例也可在配置中固定 Markdown 扫描范围。
  globs: ['**/*.md'],
  // 在共享忽略列表之后，只追加本项目的生成文档。
  ignores: [...shared.ignores, '**/generated-docs/**'],
  // 规则放 config，扫描和执行选项放外层。
  config: {
    // 继承同包 index.jsonc，不把共享规则复制到本地。
    ...shared.config,
    // 本包默认关闭行长检查；此例显式启用并改为 120 字符。
    MD013: { line_length: 120 },
  },
  // 默认允许文档中的配置注释；true 时不让这些注释调整规则。
  noInlineConfig: false,
  // 默认输出启动信息与进度；true 分别关闭对应输出。
  noBanner: false,
  noProgress: false,
  // 默认无自定义规则和 Markdown-it 插件；需要时填写实际项目模块。
  customRules: [],
  markdownItPlugins: [],
}
```

本例未设置 `fix`，检查命令不写回，`--fix` 才请求修复。固定 `fix: true` 或 `fix: false` 会改变命令行默认行为，不应作为共享执行策略复制。

## 配置字段与用途

| 字段 | 用途、默认值与条件 |
| --- | --- |
| `config` | Markdownlint 规则对象；`extends` 继承共享规则，同名规则由项目覆盖 |
| `gitignore` | 本包默认 true；CLI2 原生不默认读取 Git 忽略 |
| `globs` | 默认未设置，由 CLI 参数提供；设置后与命令行输入共同决定扫描范围 |
| `ignores` | 本包提供通用排除；追加时展开 shared.ignores |
| `fix` | 默认不写回；建议不在共用配置固定，由 CLI --fix 控制 |
| `noInlineConfig` | 默认 false，允许行内规则配置；true 忽略这些配置指令 |
| `noBanner`、`noProgress` | 默认 false，控制 CLI 的启动和进度输出 |
| `customRules` | 自定义规则模块数组，默认无；在 config 中按模块规则名启用 |
| `markdownItPlugins` | Markdown-it 插件及其参数，默认无；实际模块必须由项目声明依赖 |
| `frontMatter` | 覆盖上游识别 front matter 的正则，未设置时沿用引擎默认 |
| `outputFormatters` | 自定义诊断输出模块及参数，未设置时使用 CLI2 默认输出 |

CLI2 还提供过滤与输出等进阶字段，具体参数结构以[当前官方 Schema](https://github.com/DavidAnson/markdownlint-cli2/blob/v0.24.0/schema/markdownlint-cli2-config-schema.json)为准；它们不改变规则继承层级。

## 扫描配置与规则配置

推荐用 `.markdownlint-cli2.mjs` 加载 `/config`，继承共享扫描选项和规则；包根入口提供 JSONC 规则配置。CLI2 是本包的可选 peer：运行命令时安装 `markdownlint-cli2`，只让编辑器读取根规则时不强制安装 CLI2。

```js [.markdownlint-cli2.mjs]
// .markdownlint-cli2.mjs：复用共享扫描默认值与规则，不重复抄写排除列表。
export { default } from '@zzjtnb/markdownlint-config/config'
```

共享扫描配置默认排除 `node_modules`、`dist`、`build`、`backup`、`.nuxt`、`.wrangler`、`releases` 和整个 `src-tauri`。追加项目路径时展开 `config.ignores`，不要复制默认列表。仅通过 JSONC 的 `extends` 继承规则，不会带入 CLI2 扫描选项。

以下是只继承规则的 JSONC 备选写法；采用此方式时使用 `.markdownlint-cli2.jsonc`，不要与上面的 `.mjs` 配置并存：

```jsonc [.markdownlint-cli2.jsonc]
{
  // 读取项目 .gitignore，与下面的显式忽略项一起生效。
  "gitignore": true,
  // 不检查依赖目录和构建产物；项目专属路径可以继续追加。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 此对象只放 Markdownlint 规则；扫描及修复选项属于 CLI2 顶层。
  "config": {
    // 按已安装的 npm 包名继承共享规则。
    "extends": "@zzjtnb/markdownlint-config",
  },
}
```

JSONC 支持 `//` 和块注释。CLI2 与 VS Code 扩展会解析这些注释；也可以使用工具支持的 YAML 或 JavaScript 格式。共享配置选用 JSONC，以保留说明并使用原生 `extends`，无需增加私有工厂 API。

在 `package.json` 中添加检查和修复命令。以下示例未在 CLI2 配置中启用 `fix`，因此检查脚本不写回文件，修复脚本通过 `--fix` 请求自动修复：

```json [package.json]
{
  "scripts": {
    "lint:markdownlint": "markdownlint-cli2 \"**/*.md\"",
    "format:markdownlint": "pnpm run lint:markdownlint --fix"
  }
}
```

### package.json 字段说明

上面的 package.json 示例使用严格 JSON，各字段用途如下：

| 字段 | 用途与生效条件 |
| --- | --- |
| `scripts` | 将命令声明为 pnpm run 入口；未声明的脚本不能通过 pnpm run 调用。 |
| `scripts.lint:markdownlint` | 执行对应检查范围；不加 --fix 时只报告问题，不写回文件。 |
| `scripts.format:markdownlint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |

[rules]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/index.jsonc
[package-readme]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/README.zh-CN.md
[cli2-config]: https://github.com/DavidAnson/markdownlint-cli2/blob/v0.24.0/README.md#configuration
[vscode-config]: https://github.com/DavidAnson/vscode-markdownlint/blob/v0.62.1/README.md#configure

CLI2 配置也能通过顶层 `fix` 控制写回，且配置值可覆盖命令行 `--fix` 提供的默认值。为保持检查与修复分离，不要在共用配置中固定 `fix: true` 或 `fix: false`；无法修复的问题仍需手动处理。

规则文件 `.markdownlint.jsonc` 可以直接在根对象设置 `extends`。`gitignore`、`ignores`、`customRules` 等字段只属于 CLI2 配置，不属于规则对象；完整契约见 [CLI2 官方配置文档][cli2-config]。

## 规则与覆盖

默认规则、取值及官方链接统一维护在包内 [`index.jsonc`][rules] 中；接入与自定义规则示例见[中文包说明][package-readme]。项目只需声明不同的部分：

```jsonc [.markdownlint-cli2.jsonc]
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
    "MD033": { "allowed_elements": ["br", "details", "summary"] },
  },
}
```

规则对象按 Markdownlint 原生继承语义整体覆盖，不对选项字段深度合并。`MD033` 的默认值仍为 `false`，只有项目显式传入上述对象时才限制 HTML 标签。

## 自定义规则和直接调用 API

`customRules` 位于 CLI2 顶层，用于加载本地规则模块或已安装的规则包；加载后在 `config` 中按规则名控制开关。完整示例和可运行的规则实现见[中文包说明][package-readme]。

Markdownlint 核心 `readConfig` 默认只使用 `JSON.parse`。直接调用核心 API 读取本包时，需传入 JSONC parser，例如 `readConfig(configPath, [jsoncParse])`，其中 `jsoncParse` 由 `markdownlint-cli2/parsers/jsonc` 导出。CLI2 和 VS Code 扩展会自动提供解析器；具体 API 示例也见包说明。

## VS Code 与配置优先级

安装 `DavidAnson.vscode-markdownlint` 后，扩展会读取项目的 `.markdownlint-cli2.mjs` 或 `.markdownlint-cli2.jsonc`，无需再复制 `markdownlint.config` 规则表。该设置已被[扩展官方文档][vscode-config]标为弃用，项目文件的优先级高于全局设置。

编辑器只配置保存动作、格式化器等体验选项。包说明提供了逐项注释的设置示例：使用 `source.fixAll.markdownlint` 处理保存修复，单独将 Markdown 的 `editor.formatOnSave` 设为 `false`，避免再运行另一条保存格式化路径；手动格式化与粘贴格式化仍交给 Markdownlint。

同一目录存在 `.markdownlint.*` 规则文件时，CLI2 会用它覆盖 CLI2 配置对象中的 config。规则没有按预期生效时，先确认实际读取的规则文件；扫描选项仍在 CLI2 配置顶层维护。

`markdownlint.lintWorkspaceGlobs` 仅控制扩展的工作区检查命令，不替代 CLI2 的 globs 和 ignores。按项目实际文件设置扫描范围，并保留需要的自定义规则和输出配置。

ESLint 的 Markdown 集成还会检查代码块。由 Markdownlint 独立负责文档时，可使用 `zzjtnb({ markdown: false })`；这也会关闭 ESLint 的 Markdown 代码块检查，Markdownlint 不会补上这项能力。

## 自定义规则完整接入

只修改规则选项不需要自定义模块。确有项目专属约束时，在 ESM 项目创建 `lint-rules/no-todo.js`：

```js [lint-rules/no-todo.js]
export default {
  // 定义自定义规则的稳定名称，供配置启用和诊断识别。
  names: ['project-no-todo'],
  // 说明该自定义规则检查的文档约定。
  description: '文档不允许保留 TODO: 标记',
  // 为自定义规则标记分类，便于规则目录和工具展示。
  tags: ['project'],
  // 显式指定当前配置使用的解析器，需与输入文件语法匹配。
  parser: 'none',
  // 检查传入的文档行并通过 onError 报告问题，不直接修改输入。
  function(params, onError) {
    params.lines.forEach((line, index) => {
      const column = line.indexOf('TODO:')
      if (column !== -1) {
        onError({
          // 报告原文中的行号，从 1 开始，而非数组的零基索引。
          lineNumber: index + 1,
          // 补充该条诊断的具体原因，供终端和工作台显示。
          detail: '请完成或移除 TODO 标记',
          // 指定诊断在当前行中的起始列及长度，使用 Markdownlint 的范围约定。
          range: [column + 1, 5],
        })
      }
    })
  },
}
```

在 CLI2 配置顶层加载模块，在规则对象中启用规则：

```jsonc [.markdownlint-cli2.jsonc]
{
  // 将匹配路径排除在当前工具的扫描范围之外；glob 相对工具规定的配置根解析。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 加载项目自定义 Markdownlint 规则模块；模块中的规则名可在 config 中启用。
  "customRules": ["./lint-rules/no-todo.js"],
  // CLI2 的规则配置放在此对象；扫描、忽略、修复开关仍属于外层配置。
  "config": {
    // 先加载指定共享规则，再由本地同名规则覆盖；路径或包名须可解析。
    "extends": "@zzjtnb/markdownlint-config",
    // 启用上面加载的项目自定义规则，禁止保留 TODO: 标记。
    "project-no-todo": true,
  },
}
```

该示例检查全部原始行，包括代码块；每行报告第一个 TODO 标记，不提供自动修复。

## 使用 API 检查内存文本

```js
import { createRequire } from 'node:module'
import jsoncParse from 'markdownlint-cli2/parsers/jsonc'
import { lint, readConfig } from 'markdownlint-cli2/markdownlint/promise'

const configPath = createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config')
const config = await readConfig(configPath, [jsoncParse])
const results = await lint({
  config,
  // 按虚拟文件名提供 Markdown 字符串，不扫描磁盘文件。
  strings: {
    // 这段 Markdown 作为 sample.md 检查，结果使用该文件名索引。
    'sample.md': '# 说明\n',
  },
})

console.log(results['sample.md'])
```

此处调用 CLI2 正式导出的 Markdownlint 子路径，不导入未声明的内部文件。API 调用不会使用 CLI2 的文件扫描流程；输入的 `strings` 已决定检查对象，消费方需自行管理输入大小和错误反馈。

## VitePress 文档的检查边界

将 `.vitepress/dist` 和 `.vitepress/cache` 放进项目忽略项，正文仍正常检查。YAML frontmatter、Markdown 标题和 Vue/HTML 扩展是否能构建，需要再由 VitePress 验证。

Markdownlint 检查 Markdown 规则；站内链接、资源路径、页面构建和示例执行需另行验证。

## 诊断与自动修复的使用顺序

1. 对一份实际文档运行 CLI，确认继承来源与扫描范围。
2. 阅读规则编号、行列和错误说明，区分内容问题与配置加载错误。
3. 用 `--fix` 写回工具支持的修改。
4. 复查差异，手动处理未修复项，再检查最终文本。
5. 对站点页面另做链接、渲染和构建验证，不把 Markdownlint 的零错误解释为站点完整可用。

## 相关文档

- [快速开始](/quick-start)
- [ESLint 配置](/eslint)
- [Stylelint 配置](/stylelint)
