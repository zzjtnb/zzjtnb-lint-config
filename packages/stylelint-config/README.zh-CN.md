# @zzjtnb/stylelint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/stylelint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Fstylelint-config?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/@zzjtnb/stylelint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Fstylelint-config?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <strong><a href="./README.md">English</a> | 简体中文</strong>
</p>

<p align="center">
  <strong>面向现代 CSS、SCSS、Vue SFC、UnoCSS 和 Tailwind 风格工作流的 Stylelint 配置</strong>
</p>

## 功能特点

- 面向 Stylelint 17 构建
- ESM 优先的包入口
- 内置 TypeScript 声明，提供编辑器自动补全
- 推荐级 CSS / SCSS 错误检测规则
- 支持 Vue SFC 的 `<style>` 块
- 支持 HTML 内联样式
- 通过 `stylelint-config-recess-order` 保留项目现有 CSS 属性顺序，并由支持自动修复的 `stylelint-order` 执行
- 支持 UnoCSS 和 Tailwind 风格的 at-rules / 函数
- 支持 `@use`、`@mixin`、`@include` 等 SCSS 指令
- 支持 uni-app 等项目常用的 `rpx` 单位
- 内置生成目录、依赖目录和本地目录忽略规则

## 环境要求

| 包 | 版本 |
| --- | --- |
| Node.js | `^22.12.0 \|\| >=24.0.0` |
| Stylelint | `^17.12.0` |

本包以 ESM 为主。默认推荐使用 `stylelint.config.ts` 获得类型化配置；如果项目无法加载 TypeScript 配置文件，已设置 `"type": "module"` 时可使用 `stylelint.config.js`，否则使用 `stylelint.config.mjs`。

## 安装

```bash
pnpm add -D stylelint @zzjtnb/stylelint-config
```

本配置会内置 PostCSS，并包含以下共享预设和语法解析器：

- `stylelint-config-standard-scss`（官方 SCSS 预设，内部包含 recommended SCSS 规则和插件）
- `stylelint-config-recommended-vue`
- `stylelint-config-standard`
- `stylelint-config-recess-order`
- `stylelint-order`
- `stylelint-scss`
- `postcss-html`
- `postcss-scss`

`stylelint` 是本包的 peer dependency，仍需要由项目安装；PostCSS、parser、SCSS 规则和排序规则由本包的运行依赖自动安装，项目不需要重复声明。

## 基础用法

创建 `stylelint.config.ts`：

```ts
import type { Config } from 'stylelint'

export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],
} satisfies Config
```

本包遵循 Stylelint 标准共享配置契约：默认导出是普通 Stylelint 配置对象，消费方应继续在 `extends` 中保留 `@zzjtnb/stylelint-config` 这个清晰入口。`stylelintExecutionOptions`、`stylelintLanguageOptions`、`stylelintReportOptions`、`stylelintRules`、`stylelintIgnoreFiles`、`stylelintOverrides` 等命名导出只用于需要追加项目本地配置时做显式组合。

需要在不同工作目录运行 Stylelint 时，可以使用 `createStylelintIgnoreFiles` 生成指定根目录的忽略项；需要完全自定义忽略目录时，使用 `stylelintDefaultIgnoreGlobs` 作为起点，而不是复制整份共享配置。

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.ts --fix --cache --cache-location node_modules/.cache/.stylelintcache"
  }
}
```

## 公共导出与职责归属

| 导出 | 用途 |
| --- | --- |
| 默认导出 | 完整的 Stylelint 共享配置对象 |
| `stylelintRules` | 供本地组合或检查的共享规则映射 |
| `stylelintScssRules` | 只在 SCSS 和 Vue SFC override 中启用的 SCSS 插件规则 |
| `stylelintOverrides` | Vue / HTML / SCSS 的 parser 和预设覆盖配置 |
| `stylelintLanguageOptions` | Stylelint 17 语法扩展，例如 utility at-rules 和 `rpx` |
| `stylelintExecutionOptions` | 明确的 `allowEmptyInput`、`cache`、`fix` 默认值 |
| `stylelintIgnoreFiles` / `createStylelintIgnoreFiles()` | 共享忽略项和自定义项目根目录生成器 |

本包导出的是普通 Stylelint 配置对象，不是异步工厂。常规项目应在 `extends` 中保留包名；只有确实需要组合本地规则或路径时，才使用命名导出。

职责边界如下：

- Stylelint 本体和 CLI 由消费项目通过 peer dependency 提供；
- PostCSS 和自定义语法 parser 是本包的运行依赖；
- CSS、SCSS、Vue 和排序预设由本包统一携带；
- CSS / SCSS 由 Stylelint 处理，不交给 ESLint；Markdown 也不属于本包职责。

## 配置内容

### 基础预设

该配置按以下范围和顺序应用预设：

1. `stylelint-config-standard` 提供通用 CSS 风格规则。
2. `stylelint-config-recess-order` 保留项目现有属性顺序，底层由 `stylelint-order` 提供规则。
3. `stylelint-config-standard-scss` 只应用于 `.scss` 文件。官方 SCSS 预设已经包含 recommended SCSS 规则和 `stylelint-scss`；由于 override 还要直接处理 `.scss` 输入，本包仍以 parser 对象形式提供 `postcss-scss`。
4. `stylelint-config-recommended-vue/scss` 只应用于 `.vue` 文件。Vue preset 负责 Vue 容器及其中可能出现的 SCSS style block，本包的 `stylelintScssRules` 会在同一个 override 作用域追加。

范围很重要：通用 CSS 规则和属性排序全局生效，SCSS 和 Vue preset 只在对应的 override 中生效。这会避免普通 CSS 文件因为没有加载 SCSS 插件而出现 `Unknown rule`。当前 `stylelint-order` 排序规则支持 `stylelint --fix`，`stylelint-config-recess-order` 则避免把现有代码强制改成字母排序；HTML 解析由 Vue/HTML override 处理，独立 `.scss` 文件使用本包提供的 `postcss-scss` parser 对象。

### UnoCSS 和 Tailwind 支持

配置允许常见工具类工作流指令和函数，包括：

- `@apply`
- `@screen`
- `@theme`
- `@layer`
- `@variants`
- `@responsive`
- `@custom-variant`
- `@container-queries`
- `theme()`

### SCSS 支持

配置支持常见 SCSS 语法：

- `@use`
- `@forward`
- `@mixin`
- `@include`
- `@function`
- `@extend`
- `@if`、`@for`、`@each`、`@while`

### Vue 支持

配置支持 Vue SFC 样式和 Vue 特有选择器 / 函数：

- `:deep()` / `::v-deep`
- `:global()`
- `:slotted()` / `::v-slotted`
- `v-bind()`

### 内置执行选项

本配置显式设置 `allowEmptyInput: true`、`cache: false`、`fix: false`。这样没有样式文件的 monorepo 子包不会报错，同时缓存和写回文件这类执行策略不会被共享配置隐式开启。

执行行为选择一个清晰可见的位置即可。package scripts 可以声明 `--fix --cache --cache-location node_modules/.cache/.stylelintcache`；单独或以 Node API 使用 Stylelint 时，也可以在本地配置里覆盖 `fix` 和 `cache`。

### Stylelint 17 language options

本配置通过 `languageOptions.syntax.atRules` 注册 utility-first 框架指令，并通过 `languageOptions.syntax.units.length` 将 `rpx` 注册为自定义长度单位。对于仍需要规则级忽略项的 SCSS 插件兼容场景，会复用同一份 at-rule 列表。

`referenceFiles`、`processors` 等 Stylelint experimental 字段不会默认启用；如果项目有明确场景，请在本地配置里单独开启。

### disable 注释维护

本配置会以 warning 级别报告缺少说明、作用域无效、已经不必要、没有限定具体规则的 `stylelint-disable` 注释。这样可以帮助长期项目清理永久豁免，同时不会默认把这些维护性检查升级成阻塞错误。

### 默认忽略规则

默认忽略路径基于 `process.cwd()` 解析，因此会从使用者项目根目录生效：

- `node_modules`
- `dist`
- `build`
- `.nuxt`
- `.turbo`
- `.vercel`
- `.wrangler`
- `coverage`
- `backup`
- `releases`
- `src-tauri`
- `stats.html`
- `twa/project`

如果你需要追加本地忽略项，可以导入共享片段并用展开语法显式组合。

和 ESLint 不同，不要把文件 glob 替换成 `stylelint .`。Stylelint 配置文件没有类似 ESLint `files` 的白名单能力，因此 CLI 输入仍应限制在可能包含样式的文件上。如果脚本使用 `stylelint "**/*.{css,scss,vue,html}"` 这类全仓库宽 glob，请保留 `--config stylelint.config.ts`。这会强制 Stylelint 使用项目根配置，避免在共享忽略规则生效前，先加载备份目录或生成子项目里的 `.stylelintrc`。

## 自定义配置

简单零配置场景可以继续使用 `extends`：

```ts
export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],
}
```

需要透明地追加本地配置时，保留 `extends` 里的包入口，只覆盖需要调整的部分：

```ts
import {
  createStylelintIgnoreFiles,
  stylelintDefaultIgnoreGlobs,
} from '@zzjtnb/stylelint-config'

export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],

  // 执行参数可以放在 package scripts，也可以按调用方式放在配置里。
  // 单独或以 Node API 使用 Stylelint 时，配置级 fix/cache 会更方便。
  fix: true,
  cache: true,

  rules: {
    // 示例：不限制 hex 颜色长度
    'color-hex-length': null,

    // 示例：调整规则严重程度
    'declaration-block-no-duplicate-properties': [true, { severity: 'warning' }],
  },
  ignoreFiles: [
    ...createStylelintIgnoreFiles({
      globs: [...stylelintDefaultIgnoreGlobs, 'generated/**'],
    }),
  ],
}
```

在脚本工作目录不是项目根目录的场景：

```js
import { createStylelintIgnoreFiles } from '@zzjtnb/stylelint-config'

export default {
  extends: ['@zzjtnb/stylelint-config'],
  ignoreFiles: createStylelintIgnoreFiles({ cwd: '/workspace/project' }),
}
```

如果你希望属性分组之间保留明显空行：

```ts
export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],
  rules: {
    'declaration-empty-line-before': 'always',
    'at-rule-empty-line-before': 'always',
  },
}
```

## VS Code 推荐设置

推荐 `.vscode/settings.json`：

```json
{
  "css.validate": false,
  "scss.validate": false,
  "stylelint.validate": ["css", "scss", "vue", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "always"
  }
}
```

## 注意事项

- Stylelint 配置文件没有类似 ESLint `files` 的白名单能力。建议通过 CLI glob 和编辑器 `stylelint.validate` 控制检查文件类型。
- 本地同名 `rules` 会替换共享配置中的规则，不会与 `extends` 中的规则深度合并。
- 如果需要本地 `ignoreFiles`，推荐导入 `stylelintIgnoreFiles` 并通过 `...stylelintIgnoreFiles` 追加，保持共享忽略列表清晰可见。
- `allowEmptyInput` 在共享配置中默认开启；`fix` 和 `cache` 默认关闭，可以通过 `--fix --cache --cache-location node_modules/.cache/.stylelintcache` 这类脚本参数开启，也可以在更符合调用方式时通过本地配置开启。

## 官方参考

- [Stylelint 配置](https://stylelint.io/user-guide/configure/)
- [Stylelint CLI](https://stylelint.io/user-guide/cli/)
- [Stylelint 规则](https://stylelint.io/user-guide/rules/)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
