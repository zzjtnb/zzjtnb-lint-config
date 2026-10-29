# @zzjtnb/stylelint-config

[![@zzjtnb/stylelint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/stylelint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![许可证](https://npmx.dev/api/registry/badge/license/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![月下载量](https://npmx.dev/api/registry/badge/downloads-month/@zzjtnb/stylelint-config?style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![GitHub stars](https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social)](https://github.com/zzjtnb/zzjtnb-lint-config)

<p align="center"><strong>面向现代 CSS、SCSS、Vue SFC、UnoCSS 和 Tailwind 风格工作流的 Stylelint 配置</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint/README.md">English</a></p>

## 功能简介

检查和修复 CSS、SCSS、Vue 与 HTML 中的样式。包含属性排序、Vue 选择器和常见工具类指令支持，项目可以覆盖默认规则。

[完整使用文档](https://lint.docs.zzjtnb.com/stylelint)

## 环境要求与安装

| 包 | 版本 |
| --- | --- |
| Node.js | `^22.12.0 \|\| >=24` |
| Stylelint | `^17.16.0` |

本包为 ESM-only。默认使用 `stylelint.config.js`，项目需声明 `"type": "module"`；不需要 TypeScript 配置加载器。未声明 ESM 的项目可使用 `stylelint.config.mjs`。

```bash
# 安装 Stylelint 工具与共享配置。
pnpm add -D stylelint @zzjtnb/stylelint-config
```

## 最小配置

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

如果项目不需要本地工厂调用，也可以使用 Stylelint 原生共享配置写法：

```js
// stylelint.config.js
export default {
  // 先加载指定共享规则，再由本地同名规则覆盖；路径或包名须可解析。
  extends: ['@zzjtnb/stylelint-config'],
}
```

两种写法都支持本地 `rules`、`ignoreFiles` 和 `overrides`。工厂按本包的顺序追加列表并应用规则覆盖；原生 `extends` 使用 Stylelint 自身的继承语义，不能假设两者覆盖顺序完全相同。

## 完整配置

下面是一份完整且可以直接复制的配置文件。它追加仓库特有的忽略文件，覆盖两条共享规则，并添加一个按语法划分的 override；共享 preset 和 parser 配置不会因此被替换。

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 追加到共享绝对忽略路径之后。
  ignoreFiles: ['**/generated/**', '**/public/vendor/**'],

  // 消费方提供同名规则时覆盖共享配置中的值。
  rules: {
    // null 关闭类名格式检查，保留其他选择器检查。
    'selector-class-pattern': null,
    // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
    'no-empty-source': true,
  },

  // 追加在包内 HTML、Vue 和 SCSS override 之后。
  overrides: [
    {
      // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
      files: ['apps/legacy/**/*.vue'],
      // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
      rules: {
        // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
        'no-empty-source': null,
      },
    },
  ],
})
```

需要把本地可复用配置拆成独立片段时，可以在第一个参数之后传入完整的 Stylelint `Config` 配置片段：

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
      'no-empty-source': true,
    },
  },
  {
    // 追加需要忽略的样式文件路径，保留共享工厂默认的忽略语义。
    ignoreFiles: ['**/vendor/**'],
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 检查十六进制颜色是否合法，true 开启，null 关闭。
      'color-no-invalid-hex': true,
    },
  },
)
```

## 修改默认配置

`zzjtnb()` 的每个参数都是一个 Stylelint `Config` 对象。可以只填写需要修改的字段；多个参数从左到右合并，后面的同名规则优先。

| 配置字段 | 合并行为 |
| --- | --- |
| `rules` | 按规则名浅层合并；后续配置中的同名规则替换前面的值 |
| `extends` | 按配置顺序追加每个配置中的值 |
| `plugins` | 按配置顺序追加每个配置中的值 |
| `ignoreFiles` | 按配置顺序追加每个配置中的值 |
| `overrides` | 按配置顺序追加 override 对象 |
| 其他字段，包括 `languageOptions` | 后续配置替换前面的值 |

例如，设置 `languageOptions` 会替换整个默认对象，请保留你仍需要的字段。同名规则也会整条替换，不会拼接参数。你填写的全局 `rules` 会覆盖本包在各类文件中的默认值；同一参数中的 `overrides` 随后生效，可为指定文件设置例外。

## 默认配置

### 使用的预设与插件

默认配置使用以下 preset：

- `stylelint-config-standard`：共享 CSS 规则；
- `stylelint-config-recess-order`：属性顺序；
- `stylelint-config-recommended-vue/scss`：Vue 作用域；
- `stylelint-config-recommended-scss`：SCSS 作用域。

`stylelint-order` 由 recess-order preset 注册，`stylelint-scss` 由 SCSS 和 Vue preset 在文件作用域内注册。本包声明必要依赖并从自身依赖上下文解析 preset 入口，不再重复注册同一个插件。消费方不需要额外安装这些实现依赖。

### 支持的文件类型

解析器由本包直接加载并提供实例，消费项目无需额外安装 `postcss-html` 或 `postcss-scss`，本地链接与正式安装均适用。

| 文件作用域 | Parser / 扩展 | 规则 |
| --- | --- | --- |
| `*.css` | Stylelint 默认 CSS 语法 | 共享 CSS 规则与 CSS 专属调整 |
| `*.html`、`*.htm` | `postcss-html` | 共享 CSS 规则与 CSS 专属调整 |
| `*.vue` | `postcss-html`、Vue SCSS preset | 共享 CSS 规则和 `scss/*` 规则 |
| `*.scss` | `postcss-scss`、SCSS preset | 共享 CSS 规则和 `scss/*` 规则 |

顶层 `rules` 优先于文件 override 内继承的 preset。仅适用于 CSS / HTML 的规则在对应文件作用域声明，不在顶层重新开启 SCSS 预设已关闭的规则。工厂参数中的 `rules` 会在共享文件级默认值之后应用，再应用同一参数的 `overrides`；后续配置片段继续按此顺序覆盖。

SCSS plugin 规则只在 `.scss` 和 `.vue` override 中注册，因此普通 CSS 文件不会因缺少 SCSS plugin 而出现 `Unknown rule` 错误。

默认允许 Vue scoped 样式使用 `:deep()`、`:global()` 和 `:slotted()`，无需在项目中重复维护这些伪类的例外列表；其他未知伪类仍会报错。

### at-rule 与单位

共享配置支持 `@apply`、`@layer`、`@theme`、`@screen`、`@custom-variant` 和 `@container-queries` 等工具类框架指令，并注册 `rpx` 为 CSS 长度单位。`@apply`、`@layer` 等已由 Stylelint 原生识别，本包不重复注册；CSS / HTML 额外放宽工具类 `@apply` 的参数校验。

CSS 通过 `languageOptions.syntax.atRules` 注册工具类指令；SCSS 插件通过同一份名称列表补充工具类例外。Sass 内置指令由官方 SCSS 预设识别，不注册为 CSS 扩展。

### 默认规则

本包继承 standard 和 recess-order，仅维护工具类指令、Vue 扩展选择器、空源文件与块内节点排序等实际差异。字体回退、导入记法、媒体查询、选择器命名与特殊性、声明位置及规则块空行等均沿用上游。

最终规则同时来自继承的 preset 和文件作用域内的调整，可以用 `pnpm exec stylelint --config stylelint.config.js --print-config <文件>` 查看指定文件的实际配置。需要调整时，通过 `rules` 字段按规则名覆盖，不需要复制整份共享规则。

### 执行与报告

以下 Stylelint 配置字段使用这些默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `allowEmptyInput` | `true` | glob 没有匹配到文件时不会使本次运行失败 |
| `cache` | `false` | 除非消费方显式开启，否则 Stylelint 不使用缓存 |
| `fix` | `false` | 除非消费方显式开启，否则 Stylelint 不写回修复结果 |
| `reportDescriptionlessDisables` | `[true, { severity: 'warning' }]` | 对没有描述的 `stylelint-disable` 注释发出 warning |
| `reportInvalidScopeDisables` | `[true, { severity: 'warning' }]` | 对规则作用域无效的 disable 注释发出 warning |
| `reportNeedlessDisables` | `[true, { severity: 'warning' }]` | 对已经不再需要的 disable 注释发出 warning |
| `reportUnscopedDisables` | `[true, { severity: 'warning' }]` | 对没有指定规则的 disable 注释发出 warning |

cache 与 fix 沿用 Stylelint 原生默认值，不在共享对象中重复声明。缓存和文件写回由消费方的 CLI 参数或本地配置控制，共享配置不会隐式开启这两项行为。`allowEmptyInput: true` 只允许零匹配，不证明目标文件已经受检；需要零匹配也失败时设置 `allowEmptyInput: false`。

### 默认忽略

默认排除任意层级的 `.tmp`、`.output`、`.git`、`.cache` 和 `.codegraph` 目录。

Playwright 的 `**/playwright-report/**` 和 `**/test-results/**` 默认排除，包括嵌套项目中的报告与附件。

Stylelint 原生默认排除 `node_modules`。共享 `ignoreFiles` 额外包含：

- `dist`、`build`、`backup`、`releases`、整个 `src-tauri`、`.nuxt`、`.turbo`、`.vercel`、`.wrangler` 和 `coverage`；
- JavaScript、TypeScript、JSON 和 Markdown 等非样式文件，这些文件应交给对应的 linter 检查。

工厂每次调用按当时的工作目录生成路径；原生 `extends` 使用的默认对象则在模块加载时生成。路径以消费方工作目录为根，避免忽略规则错误地相对于包目录解析。仓库特有路径通过工厂的 `ignoreFiles` 字段追加。

`ignoreFiles` 始终追加，传空数组不会清除默认忽略项；确需完全接管时，覆盖工厂返回对象的 `ignoreFiles`，并自行保留必要的依赖和生成物排除。

## CLI 脚本

Stylelint 配置没有 ESLint Flat Config 的 `files` 白名单，因此 CLI 应使用样式文件 glob，而不是 `stylelint .`：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html,htm}\" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint --fix"
  }
}
```

### 脚本说明

以上包清单示例保持严格 JSON，字段说明列在此处，不向 package.json 插入注释。

| 字段 | 用途与生效条件 |
| --- | --- |
| `scripts` | 将命令声明为 pnpm run 入口；未声明的脚本不能通过 pnpm run 调用。 |
| `scripts.lint:stylelint` | 执行对应检查范围；不加 --fix 时只报告问题，不写回文件。 |
| `scripts.format:stylelint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |

`--cache`、`--cache-location` 和 `--fix` 都是 Stylelint CLI 选项；CLI 参数只对当前运行生效，并会覆盖共享配置中的对应默认值。

## 可用接口

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | 函数 | 创建 Stylelint `Config` 对象 |
| `default` | 运行时值 | `zzjtnb()` 的结果，供 Stylelint 原生加载和 `extends` 使用 |
| `Config` | 类型 | 从 `stylelint` 直接重新导出的原生 `Config` 类型 |

`Config` 就是 Stylelint 的原生类型；本包不再用自定义的 `Options` 或 `StylelintConfig` 别名包装它。

## VS Code

将以下示例合并到消费项目的 `.vscode/settings.json`，保留其他语言已有的保存动作。Stylelint 负责样式诊断与修复，关闭内置 CSS / SCSS / Less 重复校验：

```jsonc
{
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
    // 手动保存时应用 Stylelint 自动修复；explicit 不在自动保存时运行。
    "source.fixAll.stylelint": "explicit",
    // 禁用编辑器单独整理导入，避免覆盖 ESLint 的导入排序约定。
    "source.organizeImports": "never",
  },
}
```

## 注意事项

- TypeScript 或 JavaScript 配置文件可以使用 `zzjtnb()` 工厂，也可以导出包含 `extends` 的原生配置对象；按所需合并语义选择。
- 同名规则会替换共享规则；单条规则内部的选项不会深度合并。
- 自定义 `languageOptions` 会替换完整的共享语言模型，包括 `rpx` 单位和 at-rule 例外列表。
- Stylelint 负责 CSS、SCSS、Vue 和 HTML 样式；JavaScript、TypeScript 和 Markdown 应交给对应的 linter。

## 官方参考

- [Stylelint 配置](https://stylelint.io/user-guide/configure/)
- [Stylelint CLI](https://stylelint.io/user-guide/cli/)
- [Stylelint 规则](https://stylelint.io/user-guide/rules/)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
