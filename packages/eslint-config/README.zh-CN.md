# eslint-config-zzjtnb

<p align="center">
  <a href="https://npmjs.com/package/eslint-config-zzjtnb"><img src="https://img.shields.io/npm/v/eslint-config-zzjtnb?color=a1b858&label=npm" alt="npm version"></a>
  <a href="https://npmjs.com/package/eslint-config-zzjtnb"><img src="https://img.shields.io/npm/dm/eslint-config-zzjtnb?color=50a8d8" alt="npm downloads"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center">
  <strong><a href="./README.md">English</a> | 简体中文</strong>
</p>

<p align="center">
  <strong>面向 TypeScript、Vue、UnoCSS 和格式化场景的现代 ESLint Flat Config</strong>
</p>

## 功能特点

- 基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 构建
- ESM 优先，使用 ESLint Flat Config
- 默认启用 TypeScript 支持
- 默认启用 Vue 支持
- 默认启用 UnoCSS 排序和 blocklist 支持
- 默认通过 `eslint-plugin-format` 启用 HTML formatter；CSS / SCSS 交给 `stylelint-config-zzjtnb`
- 内置常见生成目录和本地目录忽略规则
- 提供配置选项和默认值的类型声明导出
- 默认对过期或未使用的 ESLint 行内配置注释给出 warning
- 提供 base、Vue、UnoCSS 等常用预设函数

## 环境要求

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 || ^22.13.0 || >=24` |
| ESLint | `^10.4.0` |

本包仅支持 ESM。默认推荐使用 `eslint.config.ts` 获得类型化配置；如果项目无法加载 TypeScript 配置文件，已设置 `"type": "module"` 时可使用 `eslint.config.js`，否则使用 `eslint.config.mjs`。

## 安装

```bash
pnpm add -D eslint eslint-config-zzjtnb
```

本配置已内置依赖它启用的集成：

- `@antfu/eslint-config`
- `eslint-plugin-format`
- `@unocss/eslint-plugin`

## 基础用法

创建 `eslint.config.ts`：

```ts
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb()
```

## TypeScript 配置体验

本包也导出配置选项类型，便于获得更完整的编辑器提示：

```ts
import type { EslintConfigOptions } from 'eslint-config-zzjtnb'
import zzjtnb from 'eslint-config-zzjtnb'

const options = {
  ignores: ['generated/**'],
} satisfies EslintConfigOptions

export default zzjtnb(options)
```

## 预设

```ts
import zzjtnb, { base, uno, vue } from 'eslint-config-zzjtnb'

// 默认完整配置：TypeScript + Vue + UnoCSS + HTML formatter
export default zzjtnb()

// 基础 JavaScript / TypeScript 配置，不启用 Vue 和 UnoCSS
export const baseConfig = base()

// Vue 项目配置：显式启用 Vue，UnoCSS 仍按默认启用
export const vueConfig = vue()

// UnoCSS 项目配置：显式启用 UnoCSS，Vue 仍按默认启用
export const unoConfig = uno()
```

## 配置选项

默认导出函数兼容 `@antfu/eslint-config` 第一参数选项，并常用以下字段：

```ts
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb({
  // 默认已启用
  typescript: true,
  vue: true,
  unocss: true,
  jsonc: true,
  yaml: true,
  toml: true,

  // 如果项目是库包，可以启用更偏库包的规则
  type: 'lib',

  // 扩展默认忽略列表
  ignores: ['generated/**'],

  // 覆盖代码风格偏好
  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  // 扩展格式化器设置，或传 false 关闭 formatter
  formatters: {
    html: true,
    // 如果 CSS / SCSS 不交给 Stylelint，再开启这一项
    // css: true,
  },

  // 默认关闭 Markdown lint，交给 markdownlint-cli2
  markdown: false,

  // 扩展 ESLint Flat Config linter 级选项
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

你也可以在选项对象后继续传入 ESLint Flat Config 对象：

```ts
import zzjtnb from 'eslint-config-zzjtnb'

export default zzjtnb(
  {
    vue: false,
    unocss: false,
  },
  {
    rules: {
      'no-console': 'warn',
    },
  },
)
```

## 默认行为

### 默认启用的集成

| 集成 | 默认状态 |
| --- | --- |
| TypeScript | 启用 |
| Vue | 启用 |
| UnoCSS | 启用 |
| JSON / JSONC | 启用 |
| YAML | 启用 |
| TOML | 启用 |
| Markdown lint | 关闭 |
| CSS formatter | 默认关闭，交给 Stylelint |
| HTML formatter | 启用 |

### pnpm workspace 设置

针对 `pnpm-workspace.yaml`，本配置会覆盖上游 `pnpm/yaml-enforce-settings` 的默认值，并禁止 `shellEmulator` 和 `trustPolicy`。这两个字段属于本机或安装策略偏好，不应在执行 `eslint --fix` 时被自动写回。

### 默认忽略项

配置会忽略常见生成目录、本地目录或特殊文档：

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

## VS Code 推荐设置

推荐 `.vscode/settings.json`：

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always",
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

## 常用脚本

```json
{
  "scripts": {
    "lint": "eslint . --fix --cache --cache-location node_modules/.cache/.eslintcache"
  }
}
```

`--fix`、`--cache`、`--cache-location` 是 ESLint CLI / Node API 执行选项，不是 Flat Config 字段；共享配置里不能像 Stylelint 那样内置这些执行开关，所以推荐 `lint` 脚本默认就带 `--fix`。

如果希望 CI 连 warning 也不允许，可以在脚本后追加 `--max-warnings 0`。它没有放进默认示例，是因为业务项目可能希望逐步推进零 warning 约束。

## 注意事项

- 本配置面向现代 ESM 项目。
- 默认遵循 `@antfu/eslint-config` 约定：单引号、无分号、排序 imports、Flat Config 组合方式。
- 如果某个包不需要 Vue 或 UnoCSS，请使用 `base()`。

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
