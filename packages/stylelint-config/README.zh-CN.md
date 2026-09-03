# @zzjtnb/stylelint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/stylelint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Fstylelint-config?color=a1b858&label=npm" alt="npm 版本"></a>
  <a href="https://npmjs.com/package/@zzjtnb/stylelint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Fstylelint-config?color=50a8d8&label=下载量" alt="npm 下载量"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center"><strong>面向现代 CSS、SCSS、Vue SFC、UnoCSS 和 Tailwind 风格工作流的 Stylelint 配置</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="./README.md">English</a></p>

## 包的职责

`@zzjtnb/stylelint-config` 是一个带明确默认值的 Stylelint 共享配置，工厂入口风格与 `@zzjtnb/eslint-config` 一致。

- `zzjtnb()` 创建完整的 Stylelint `Config` 对象。
- 共享默认值、规则和按语法划分的 override 在包入口统一组合。
- Stylelint、CLI 和 PostCSS 生态依赖遵循各自的依赖边界。
- 配置直接使用 Stylelint 原生字段名：`extends`、`plugins`、`ignoreFiles`、`rules`、`overrides`、`languageOptions`、`cache` 和 `fix`。

Stylelint 配置是对象，不是 ESLint 的 Flat Config 数组。因此工厂返回 `Config` 对象，同时保留 `zzjtnb()` 的默认导出结果，以兼容 Stylelint 原生的 `extends` 解析。

## 环境要求与安装

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| Stylelint | `^17.12.0` |

本包为 ESM-only。优先使用 `stylelint.config.ts`；如果项目不能加载 TypeScript 配置，ESM 项目使用 `stylelint.config.js`，其他项目使用 `stylelint.config.mjs`。

```bash
pnpm add -D stylelint @zzjtnb/stylelint-config
```

## 最小配置

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

如果项目不需要本地工厂调用，也可以使用 Stylelint 原生共享配置写法：

```ts
// stylelint.config.ts
export default {
  extends: ['@zzjtnb/stylelint-config'],
}
```

需要添加本地规则、忽略项或 override 时使用工厂写法；共享默认值已经足够时使用原生写法。

## 完整配置

下面是一份完整且可以直接复制的配置文件。它追加仓库特有的忽略文件，覆盖两条共享规则，并添加一个按语法划分的 override；共享 preset 和 parser 配置不会因此被替换。

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 追加到共享绝对忽略路径之后。
  ignoreFiles: [
    '**/generated/**',
    'packages/*/README*.md',
  ],

  // 消费方提供同名规则时覆盖共享配置中的值。
  rules: {
    'selector-class-pattern': null,
    'no-empty-source': 'error',
  },

  // 追加在包内 HTML、Vue 和 SCSS override 之后。
  overrides: [
    {
      files: ['apps/legacy/**/*.vue'],
      rules: {
        'scss/operator-no-newline-after': null,
      },
    },
  ],
})
```

需要把本地可复用配置拆成独立片段时，可以在第一个参数之后传入完整的 Stylelint `Config` 配置片段：

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  { rules: { 'no-empty-source': 'error' } },
  {
    ignoreFiles: ['**/vendor/**'],
    rules: {
      'color-no-invalid-hex': true,
    },
  },
)
```

## 配置行为

第一个参数是 Stylelint 原生的 `Partial<Config>`，后续参数是完整的 Stylelint `Config` 配置片段。工厂从共享默认值开始，依次处理第一个参数和每一个后续片段。

| 配置字段 | 合并行为 |
| --- | --- |
| `rules` | 按规则名浅层合并；后续配置中的同名规则替换前面的值 |
| `extends` | 按配置顺序追加每个配置中的值 |
| `plugins` | 按配置顺序追加每个配置中的值 |
| `ignoreFiles` | 按配置顺序追加每个配置中的值 |
| `overrides` | 按配置顺序追加 override 对象 |
| 其他字段，包括 `languageOptions` | 后续配置替换前面的值 |

合并不是深度合并。例如，传入自定义 `languageOptions` 会替换完整的共享 `languageOptions` 对象，而不是只合并其中一个嵌套的 syntax 属性；规则只按最外层规则名合并。

## 默认配置

### Preset 与 plugin

默认配置使用以下 preset：

- `stylelint-config-standard`：共享 CSS 规则；
- `stylelint-config-recess-order`：属性顺序；
- `stylelint-config-recommended-vue/scss`：Vue 和 SCSS 作用域；
- `stylelint-config-recommended-scss`：SCSS 作用域。

`stylelint-order` plugin 由本包注册。本包会把自身依赖解析为绝对路径，避免 Stylelint 在 pnpm 消费方解析上下文中找不到该 plugin。消费方不需要额外安装这些实现依赖。

### 语法作用域

| 文件作用域 | Parser / 扩展 | 规则 |
| --- | --- | --- |
| `*.html`、`*.htm` | `postcss-html` | 共享 CSS 规则 |
| `*.vue` | `postcss-html`、Vue SCSS preset | 共享 CSS 规则和 `scss/*` 规则 |
| `*.scss` | `postcss-scss`、SCSS preset、Vue SCSS preset | 共享 CSS 规则和 `scss/*` 规则 |

SCSS plugin 规则只在 `.scss` 和 `.vue` override 中注册，因此普通 CSS 文件不会因缺少 SCSS plugin 而出现 `Unknown rule` 错误。

### at-rule 与单位

共享 syntax 模型允许 `@apply`、`@layer`、`@theme`、`@screen`、`@custom-variant` 和 `@container-queries` 等工具类框架指令，并注册 `rpx` 为 CSS 长度单位。

核心 `at-rule-no-unknown` 和 SCSS 的 `scss/at-rule-no-unknown` 使用同一份 at-rule 例外列表，因此 CSS 与 SCSS 遵循一致的框架语法策略。

### 默认规则

本包保留 standard 和 recess-order preset，同时显式放宽与仓库 CSS、Vue、SCSS 或工具类框架约定冲突的规则。例如未知工具类 at-rule 和函数、通用字体族要求、选择器特殊性顺序、空源文件、部分选择器限制以及部分声明位置检查。

完整规则映射就是已发布包中的 `rules` 对象。需要调整时，通过 `rules` 字段按规则名覆盖，不需要复制整份共享规则。

### 执行与报告

以下 Stylelint 配置字段使用这些默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `allowEmptyInput` | `true` | glob 没有匹配到文件时不会使本次运行失败 |
| `cache` | `false` | 除非消费方显式开启，否则 Stylelint 不使用缓存 |
| `fix` | `false` | 除非消费方显式开启，否则 Stylelint 不写回修复结果 |
| `reportDescriptionlessDisables` | `'warning'` | 对没有描述的 `stylelint-disable` 注释发出 warning |
| `reportInvalidScopeDisables` | `'warning'` | 对规则作用域无效的 disable 注释发出 warning |
| `reportNeedlessDisables` | `'warning'` | 对已经不再需要的 disable 注释发出 warning |
| `reportUnscopedDisables` | `'warning'` | 对没有指定规则的 disable 注释发出 warning |

缓存和文件写回由消费方的 CLI 参数或本地配置控制，共享配置不会隐式开启这两项行为。

### 默认忽略

默认 `ignoreFiles` 根据消费方项目的 `process.cwd()` 生成绝对路径，包含：

- `node_modules`、`dist`、`build`、`.nuxt`、`.turbo`、`.vercel`、`.wrangler` 和 `coverage`；
- JavaScript、TypeScript、JSON 和 Markdown 等非样式文件，这些文件应交给对应的 linter 检查。

使用共享配置时，路径以消费方工作目录为根，避免忽略规则错误地相对于包目录解析。仓库特有路径通过工厂的 `ignoreFiles` 字段追加。

## CLI 脚本

Stylelint 配置没有 ESLint Flat Config 的 `files` 白名单，因此 CLI 应使用样式文件 glob，而不是 `stylelint .`：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.ts --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint -- --fix"
  }
}
```

`--cache`、`--cache-location` 和 `--fix` 都是 Stylelint CLI 选项；CLI 参数只对当前运行生效，并会覆盖共享配置中的对应默认值。

## 公共导出

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | 函数 | 创建 Stylelint `Config` 对象 |
| `default` | 运行时值 | `zzjtnb()` 的结果，供 Stylelint 原生加载和 `extends` 使用 |
| `Config` | 类型 | 从 `stylelint` 直接重新导出的原生 `Config` 类型 |

`Config` 就是 Stylelint 的原生类型；本包不再用自定义的 `Options` 或 `StylelintConfig` 别名包装它。

## VS Code

下面的设置与本仓库最新 `.vscode/settings.json` 中和 Stylelint 相关的配置一致：

```json
{
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "stylelint.packageManager": "pnpm",
  "stylelint.validate": ["css", "scss", "vue", "html"],
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": "explicit",
    "source.organizeImports": "never"
  }
}
```

## 注意事项

- TypeScript 或 JavaScript 配置文件使用 `zzjtnb()`；只需要原生共享配置加载时使用 `extends: ['@zzjtnb/stylelint-config']`。
- 同名规则会替换共享规则；单条规则内部的选项不会深度合并。
- 自定义 `languageOptions` 会替换完整的共享语言模型，包括 `rpx` 单位和 at-rule 例外列表。
- Stylelint 负责 CSS、SCSS、Vue 和 HTML 样式；JavaScript、TypeScript 和 Markdown 应交给对应的 linter。

## 官方参考

- [Stylelint 配置](https://stylelint.io/user-guide/configure/)
- [Stylelint CLI](https://stylelint.io/user-guide/cli/)
- [Stylelint 规则](https://stylelint.io/user-guide/rules/)
- [Stylelint 共享配置](https://stylelint.io/user-guide/configure/)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
