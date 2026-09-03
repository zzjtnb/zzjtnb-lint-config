# @zzjtnb/eslint-config

<p align="center">
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/v/%40zzjtnb%2Feslint-config?color=a1b858&label=npm" alt="npm 版本"></a>
  <a href="https://npmjs.com/package/@zzjtnb/eslint-config"><img src="https://img.shields.io/npm/dm/%40zzjtnb%2Feslint-config?color=50a8d8&label=下载量" alt="npm 下载量"></a>
  <a href="https://github.com/zzjtnb/zzjtnb-lint-config"><img src="https://img.shields.io/github/stars/zzjtnb/zzjtnb-lint-config?style=social" alt="GitHub stars"></a>
</p>

<p align="center"><strong>基于 @antfu/eslint-config 的 TypeScript、Vue 与 pnpm ESLint Flat Config</strong></p>

<p align="center"><strong>简体中文</strong> | <a href="./README.md">English</a></p>

## 包的职责

`@zzjtnb/eslint-config` 是 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的轻量封装。

- parser、plugin、推荐规则和排序集成由 `@antfu/eslint-config` 负责。
- 本包启用仓库使用的语言和工具集成，并只追加文档中说明的规则覆盖。
- 本包不重新实现 antfu 的排序规则，也不重复安装 antfu 已管理的 parser 和 plugin。
- 运行时唯一导出是异步配置工厂 `zzjtnb`。

工厂返回 ESLint Flat Config promise。第一个参数使用 antfu 的 options 模型，后续参数接收额外的 Flat Config 配置片段。

## 环境要求与安装

| 包 | 版本 |
| --- | --- |
| Node.js | `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| ESLint | `^10.4.0` |

本包为 ESM-only。如果项目及其 ESLint 设置支持 TypeScript 配置，使用 `eslint.config.ts`；否则 ESM 项目使用 `eslint.config.js`，非 ESM 项目使用 `eslint.config.mjs`。

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

## 最小配置

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

直接调用时默认启用本仓库使用的 TypeScript、Vue、JSON / JSONC、YAML、TOML、Markdown、Node、pnpm、perfectionist 和 stylistic 集成。UnoCSS 和外部 formatter 集成仍需显式开启。

## 完整配置

下面是一份完整且可以直接复制的配置文件。它保留共享默认值，显式展示常用集成开关，追加一个项目级忽略路径，覆盖一条规则，并设置 Flat Config 的 linter 选项。`jsonc`、`yaml`、`toml`、`markdown`、`node`、`typescript`、`vue`、`stylistic` 和 `pnpm` 都会原样传给 antfu，并不是本包重新定义的配置字段。

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 传给 @antfu/eslint-config 的语言和文件格式集成。
  typescript: true,
  vue: true,
  jsonc: true,
  yaml: true,
  toml: true,
  markdown: true,
  node: true,

  // 保留 package.json、workspace YAML 检查和排序。
  pnpm: {
    json: true,
    yaml: true,
    sort: true,
  },

  // 保留 antfu 的 stylistic 规则；由其他 formatter 负责格式化时改为 false。
  stylistic: true,
  unocss: false,
  formatters: false,

  // 追加到 antfu 已解析的忽略列表之后。
  ignores: ['generated/**'],

  // 添加到 JavaScript / TypeScript 配置片段中的规则。
  rules: {
    'no-console': 'warn',
  },

  // ESLint 原生 Flat Config linter 选项。
  linterOptions: {
    reportUnusedDisableDirectives: 'warn',
    reportUnusedInlineConfigs: 'warn',
  },
})
```

需要追加另一个原生 Flat Config 配置片段时，将它放在第一个参数之后：

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  { stylistic: false },
  {
    files: ['scripts/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
)
```

## 配置行为

第一个参数继承 antfu 的 `OptionsConfig`，并额外提供本包的 `defaultIgnores`。后续参数会作为 ESLint Flat Config 配置片段传给 antfu，并由 ESLint 按原本的顺序处理。

| 输入 | 行为 |
| --- | --- |
| `typescript`、`vue`、`jsonc`、`yaml`、`toml`、`markdown`、`node`、`stylistic`、`unocss`、`formatters` 及其他 antfu 字段 | 原样传给 `@antfu/eslint-config`，不改名、不重新包装 |
| `pnpm` | 原样传给 antfu；本包另外关闭 `pnpm/yaml-enforce-settings`，避免 ESLint fix 写入 workspace 策略设置 |
| `rules` | 用于本包的 JavaScript / TypeScript 配置片段；消费方提供同名规则时覆盖本包的值 |
| `linterOptions` | 作为原生 ESLint Flat Config linter 选项应用到 JavaScript / TypeScript 配置片段 |
| `ignores` | 添加到 antfu 默认忽略项和本包通用生成物忽略项之后 |
| `defaultIgnores` | 替换本包的通用生成物列表；传 `false` 时由消费方完全接管忽略结果 |
| 后续 Flat Config 配置片段 | 传给 antfu，并由 ESLint 根据配置片段顺序处理优先级 |

antfu options 不执行自定义深度合并，消费方传入的值会原样交给 antfu。`rules` 则在本包规则之后应用消费方的同名值，因此消费方可以覆盖共享规则。

### 格式化职责

本包默认启用 antfu 的 stylistic 规则。如果 Oxfmt、Prettier 或其他 formatter 是项目唯一的格式化工具，应在配置边界关闭 ESLint 格式化规则：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  stylistic: false,
})
```

`stylistic: false` 会关闭 stylistic 规则集；`stylistic: { semi: true }` 会保留规则集并只修改 `semi` 选项，两者不是同一行为。

外部 formatter 集成与 stylistic 规则是两个独立开关。只有在安装了 antfu 版本所需的可选依赖后，才应显式开启：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  formatters: { css: true },
})
```

完整的 formatter 和 stylistic 选项请以当前安装版本的 [`OptionsConfig`](https://github.com/antfu/eslint-config/blob/main/src/types.ts) 及其定制文档为准。

### UnoCSS

UnoCSS 使用可选的上游集成，因此默认关闭。先安装当前 antfu 版本要求的依赖，再显式开启：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  unocss: true,
})
```

### pnpm workspace

`pnpm` 对象由 antfu 负责，因此它的字段、默认值、parser 注册和排序行为以当前安装的 antfu 版本为准。本包唯一的 pnpm 规则调整是关闭 `pnpm/yaml-enforce-settings`，防止 ESLint fix 静默向 `pnpm-workspace.yaml` 写入 `trustPolicy` 或 `shellEmulator` 等设置。

- `pnpm: false` 会关闭 antfu 的 pnpm 集成。
- `pnpm: { yaml: false, sort: false }` 会保留 package.json 检查，同时关闭 workspace YAML 解析和排序。
- 其他 pnpm 字段应查阅当前安装的 antfu 版本，不要复制为本包私有类型。

### 忽略行为

正常情况下，antfu 原有的忽略列表会继续生效。本包只补充项目通用的生成物和资源路径，例如 `dist-*`、`*-dist`、Nitro 输出、快照和字体文件；不会忽略脚本、测试、CI 配置或仓库特有目录。

使用 `ignores` 追加仓库特有路径：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  ignores: [
    'generated/**',
    'vendor/**',
  ],
})
```

只有在消费方必须定义完整忽略结果时，才使用 `defaultIgnores: false`：

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  defaultIgnores: false,
  ignores: [
    'node_modules/**',
    'dist/**',
  ],
})
```

## 规则归属与作用域

本包不重复实现 antfu 的排序逻辑。import / export 排序、package.json 排序、tsconfig 排序、pnpm workspace 排序和 perfectionist 排序都继续由 antfu 提供。

本包只追加少量明确的规则覆盖，包括放宽链式调用、列表换行、控制流大括号和顶层函数约定，以及仓库的 `no-restricted-syntax` 和注释空格策略。完整规则映射属于已发布包的一部分，可通过 `rules` 字段覆盖。

## 公共导出

本包提供一个运行时导出和四个类型导出：

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | 函数 | 创建 `Promise<Linter.Config[]>`，用于 ESLint Flat Config |
| `ESLintConfigOptions` | 类型 | 第一个工厂参数的类型，包括 `defaultIgnores` |
| `ESLintUserConfig` | 类型 | 工厂后续参数接收的 Flat Config 配置片段类型 |
| `ESLintPnpmOptions` | 类型 | antfu `pnpm` 对象选项类型 |
| `ESLintStylisticOptions` | 类型 | antfu `stylistic` 对象选项类型 |

本包没有默认运行时导出；请使用具名导入 `zzjtnb`。

## VS Code

下面的设置与本仓库最新 `.vscode/settings.json` 中和 ESLint 相关的配置一致：关闭重复的格式化，让编辑器只在明确请求时运行 ESLint 修复，并校验本仓库启用的全部语言：

```json
{
  "prettier.enable": false,
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "never"
  },
  "eslint.rules.customizations": [
    { "rule": "style/*", "severity": "off", "fixable": true },
    { "rule": "format/*", "severity": "off", "fixable": true },
    { "rule": "*-indent", "severity": "off", "fixable": true },
    { "rule": "*-spacing", "severity": "off", "fixable": true },
    { "rule": "*-spaces", "severity": "off", "fixable": true },
    { "rule": "*-order", "severity": "off", "fixable": true },
    { "rule": "*-dangle", "severity": "off", "fixable": true },
    { "rule": "*-newline", "severity": "off", "fixable": true },
    { "rule": "*quotes", "severity": "off", "fixable": true },
    { "rule": "*semi", "severity": "off", "fixable": true }
  ],
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

## 脚本

```json
{
  "scripts": {
    "lint": "eslint . --cache --cache-location node_modules/.cache/.eslintcache",
    "format": "pnpm run lint -- --fix"
  }
}
```

`--fix`、`--cache` 和 `--cache-location` 都是 ESLint CLI 选项。共享配置不会隐式开启文件写回或缓存。

## 官方参考

- [antfu/eslint-config 定制](https://github.com/antfu/eslint-config#customization)
- [antfu/eslint-config 选项](https://github.com/antfu/eslint-config/blob/main/src/types.ts)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint CLI](https://eslint.org/docs/latest/use/command-line-interface)

## 许可证

[MIT](https://github.com/zzjtnb/zzjtnb-lint-config/blob/master/LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
