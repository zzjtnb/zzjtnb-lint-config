# stylelint-config-zzjtnb

<p align="center">
  <a href="https://npmjs.com/package/stylelint-config-zzjtnb"><img src="https://img.shields.io/npm/v/stylelint-config-zzjtnb?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/stylelint-config-zzjtnb"><img src="https://img.shields.io/npm/dm/stylelint-config-zzjtnb?color=50a8d8" alt="npm downloads"></a>
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
- 通过 `stylelint-config-clean-order` 提供逻辑化 CSS 属性排序
- 支持 UnoCSS 和 Tailwind 风格的 at-rules / 函数
- 支持 `@use`、`@mixin`、`@include` 等 SCSS 指令
- 支持 uni-app 等项目常用的 `rpx` 单位
- 内置生成目录、依赖目录和本地目录忽略规则

## 环境要求

| 包 | 版本 |
| --- | --- |
| Node.js | `>=20.19.0` |
| Stylelint | `^17.12.0` |

本包以 ESM 为主。项目已设置 `"type": "module"` 时可使用 `stylelint.config.js`；非 ESM 项目可使用 `stylelint.config.mjs`。

## 安装

```bash
pnpm add -D stylelint stylelint-config-zzjtnb
```

本配置包含以下共享预设和语法解析器：

- `stylelint-config-recommended-scss`
- `stylelint-config-recommended-vue`
- `stylelint-config-clean-order`
- `postcss-html`
- `postcss-scss`

## 基础用法

创建 `stylelint.config.js`：

```js
export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
}
```

本包遵循 Stylelint 标准共享配置契约：默认导出是普通 Stylelint 配置对象，消费方应继续在 `extends` 中保留 `stylelint-config-zzjtnb` 这个清晰入口。`stylelintExecutionOptions`、`stylelintLanguageOptions`、`stylelintReportOptions`、`stylelintRules`、`stylelintIgnoreFiles`、`stylelintOverrides` 等命名导出只用于需要追加项目本地配置时做显式组合。

TypeScript 项目可以使用 `stylelint.config.ts` 并配合 Stylelint 官方 `Config` 类型：

```ts
import type { Config } from 'stylelint'

export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
} satisfies Config
```

在 `package.json` 中添加脚本：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.js --fix --cache --cache-location node_modules/.cache/.stylelintcache"
  }
}
```

## 配置内容

### 基础预设

该配置按以下顺序继承预设：

1. `stylelint-config-recommended-scss`
2. `stylelint-config-recommended-vue/scss`
3. `stylelint-config-clean-order`

顺序很重要：CSS / SCSS 基础错误检测先应用，Vue SFC + SCSS 组合规则随后叠加，属性排序规则最后应用。HTML、Vue 和 SCSS 解析由本包自己的 `overrides` 直接传入 parser 对象。

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
- `src-tauri`
- `src-tauri-harmony`
- `stats.html`
- `twa/project`
- `fonts`
- `shadcn-vue`
- `packages/*/README*.md`

如果你需要追加本地忽略项，可以导入共享片段并用展开语法显式组合。

和 ESLint 不同，不要把文件 glob 替换成 `stylelint .`。Stylelint 配置文件没有类似 ESLint `files` 的白名单能力，因此 CLI 输入仍应限制在可能包含样式的文件上。如果脚本使用 `stylelint "**/*.{css,scss,vue,html}"` 这类全仓库宽 glob，请保留 `--config stylelint.config.js`。这会强制 Stylelint 使用项目根配置，避免在共享忽略规则生效前，先加载备份目录或生成子项目里的 `.stylelintrc`。

## 自定义配置

简单零配置场景可以继续使用 `extends`：

```js
export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
}
```

需要透明地追加本地配置时，保留 `extends` 里的包入口，只覆盖需要调整的部分：

```js
import {
  stylelintIgnoreFiles,
} from 'stylelint-config-zzjtnb'

export default {
  extends: [
    'stylelint-config-zzjtnb',
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
    ...stylelintIgnoreFiles,
    'generated/**',
  ],
}
```

如果你希望属性分组之间保留明显空行：

```js
export default {
  extends: [
    'stylelint-config-zzjtnb',
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

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
