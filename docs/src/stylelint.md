---
navigation:
  text: Stylelint
  group: configuration
  order: 20
---

# Stylelint 配置

`@zzjtnb/stylelint-config` 是 Stylelint 17 的对象式共享配置。它直接使用 Stylelint 原生 `Config` 字段，公开具名工厂 `zzjtnb`，并提供默认配置对象供 Stylelint 原生 `extends` 加载。

## 安装与接入

```bash
pnpm add -D stylelint @zzjtnb/stylelint-config
```

在消费项目根目录创建 `stylelint.config.ts`。以下两种方式都导出 Stylelint 配置对象，而不是 ESLint Flat Config 数组；没有本地调整时，工厂方式可直接使用 `export default zzjtnb()`。

## 两种使用方式

### 工厂方式

本节以包含项目本地覆盖的配置为例。工厂先组装共享默认值，再应用消费方参数：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  ignoreFiles: ['**/generated/**'],
  rules: {
    'selector-class-pattern': null,
  },
})
```

### 原生 extends

共享默认值已经足够时，可以让 Stylelint 原生加载包：

```ts
export default {
  extends: ['@zzjtnb/stylelint-config'],
}
```

原生 `extends` 也可以与 Stylelint 原生配置字段（如 `rules`、`ignoreFiles` 和 `overrides`）一起使用；工厂方式适合 TypeScript 配置中希望直接调用 `zzjtnb()`、复用共享配置对象并获得完整 `Config` 类型提示的场景。

## 从旧配置迁移

升级到本包后，消费项目不必重复加载 standard、SCSS、Vue、recess-order preset 或声明 parser。默认语法已覆盖 `custom-variant`、`theme`、`apply`、`layer`、`screen`、`variants`、`responsive`，并通过长度单位模型允许 `rpx`，因此可移除这些重复的 at-rule 和单位例外。

项目自身的接口生成目录、第三方源码及备份目录仍通过 `ignoreFiles` 追加；不会因为插件已加载而被自动排除。类似 uni-app `page` 元素这样的目标框架约定可继续使用 Stylelint 原生规则配置：

```ts
export default zzjtnb({
  ignoreFiles: ['**/generated/**'],
  rules: {
    'selector-type-no-unknown': [true, {
      ignore: ['custom-elements'],
      ignoreTypes: ['page'],
    }],
  },
})
```

保留消费项目原来的修复和格式化策略；本包不要求迁移到另一套 Git Hook 或额外格式化工具。

## 工厂签名

```ts
function zzjtnb(
  config?: Partial<Config>,
  ...configs: Config[]
): Config
```

第一个参数是 `Partial<Config>`，后续参数是完整的 Stylelint `Config` 片段：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    rules: {
      'no-empty-source': true,
    },
  },
  {
    ignoreFiles: ['**/vendor/**'],
    rules: {
      'color-no-invalid-hex': true,
    },
  },
)
```

工厂不会重新命名 Stylelint 字段，也不会把 `Config` 包装成私有的 `StylelintConfigOptions` 或执行选项类型。

## 合并行为

工厂从本包默认配置开始，再依次处理第一个参数和每一个后续片段：

| 字段 | 合并行为 |
| --- | --- |
| `rules` | 按规则名浅层合并；后面的同名值覆盖前面的值 |
| `extends` | 按顺序追加 |
| `plugins` | 按顺序追加 |
| `ignoreFiles` | 按顺序追加 |
| `overrides` | 按顺序追加 override 对象 |
| 其他字段，包括 `languageOptions` | 后面的字段整体替换前面的字段 |

这不是深度合并：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  languageOptions: {
    syntax: {
      units: {
        length: ['rpx', 'vw'],
      },
    },
  },
})
```

上面的 `languageOptions` 会替换共享的完整 language model。它不会自动保留共享配置中的 at-rule 列表；如果需要保留共享语法能力，应在本地完整声明，或只使用原有 `languageOptions` 并通过规则字段进行调整。

规则同名覆盖示例：

```ts
export default zzjtnb({
  rules: {
    // 只覆盖这一条，其他共享规则继续生效。
    'declaration-no-important': null,
  },
})
```

## 默认 preset 和 plugin

默认配置包含：

| 配置 | 作用域 | 用途 |
| --- | --- | --- |
| `stylelint-config-standard` | 全局 | CSS 标准规则 |
| `stylelint-config-recess-order` | 全局 | 属性顺序 |
| `stylelint-config-recommended-scss` | `.scss` | SCSS 推荐规则 |
| `stylelint-config-recommended-vue/scss` | `.vue` | Vue 容器和 SCSS 规则 |
| `stylelint-order` | 全局 plugin | 提供 `order/*` 规则 |

共享包从自身依赖上下文解析 preset 的绝对路径，避免 Stylelint 在 pnpm 消费项目中找不到依赖。`stylelint-order` 由 recess-order preset 注册，`stylelint-scss` 由 SCSS / Vue preset 按文件作用域注册，共享入口不重复注册插件。消费项目只需要直接安装 `stylelint` 和本包，不需要复制这些实现依赖。

## 文件语法作用域

本包通过 `overrides` 为不同文件扩展名选择 parser 和 preset：

| 文件 | `customSyntax` | 追加配置 | 结果 |
| --- | --- | --- | --- |
| `*.css` | Stylelint 默认 CSS 语法 | 无 | CSS 规则和属性顺序 |
| `*.scss` | `postcss-scss` | SCSS preset | CSS、SCSS 和 `scss/*` 规则 |
| `*.vue` | `postcss-html` | Vue SCSS preset | SFC 中的 CSS、SCSS 和 Vue 容器 |
| `*.html`、`*.htm` | `postcss-html` | 无 | HTML 容器中的 CSS |

顶层 `rules` 优先于文件 override 内继承的 preset。仅适用于 CSS / HTML 的规则在对应文件作用域声明，不在顶层重新开启 SCSS 预设已关闭的规则。工厂参数中的 `rules` 会在共享文件级默认值之后应用，再应用同一参数的 `overrides`；后续配置片段继续按此顺序覆盖。

SCSS plugin 规则只在 `.scss` 和 `.vue` override 中注册。普通 CSS 不会因为全局配置引用 `scss/*` 而收到 `Unknown rule`。

Stylelint CLI 仍然按扩展名匹配配置 override；不要把所有文件交给 `stylelint .`。

## 原生字段

本包公开的配置字段就是 Stylelint 原生字段：

| 字段 | 作用 |
| --- | --- |
| `extends` | 加载共享 preset 或其他配置文件 |
| `plugins` | 注册 Stylelint plugin |
| `ignoreFiles` | 忽略不需要检查的文件 |
| `rules` | 设置规则及其选项 |
| `overrides` | 按文件 glob 追加局部配置 |
| `languageOptions` | 声明语法、at-rule 和单位 |
| `allowEmptyInput` | 控制空输入是否失败 |
| `cache` | 控制 Stylelint 缓存 |
| `fix` | 控制是否写回修复结果 |
| `report*` | 控制 disable 注释报告 |

## languageOptions

共享语言模型为工具类 CSS 框架注册额外指令，并将 `rpx` 注册为长度单位。下面只是结构节选，不是可直接替换完整默认值的配置；完整定义见[本包语法配置源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint-config/src/configs/syntax.ts)：

```ts
export const languageOptions = {
  syntax: {
    atRules: {
      config: { comment: 'Utility-first framework directive' },
      'custom-variant': { comment: 'Utility-first framework directive' },
      theme: { comment: 'Utility-first framework directive' },
      unocss: { comment: 'Utility-first framework directive' },
    },
    units: {
      length: ['rpx'],
    },
  },
}
```

共享语法模型注册的工具类 at-rule 包括：

```text
@config
@container-queries
@custom-variant
@extends
@ignores
@plugin
@reference
@responsive
@screen
@source
@tailwind
@theme
@uno
@unocss
@unocss-apply
@unocss-variants
@utilities
@utility
@variant
@variants
```

列表只包含 Stylelint 与 SCSS 插件原生不识别的工具类指令；Sass 内置指令由 SCSS 预设和插件识别，Stylelint 已原生识别的 at-rule 也不重复注册。SCSS preset 不读取 Stylelint 17 的 `languageOptions.syntax.atRules`，因此 SCSS 规则会复用同一份工具类指令列表，避免 CSS 与 SCSS 的例外漂移。

## 默认规则覆盖

本包保留 standard 和 recess-order preset，只显式放宽与 Vue、SCSS、UnoCSS、Tailwind 风格或现有项目语法冲突的规则：

| 规则 | 默认值 | 作用 |
| --- | --- | --- |
| `at-rule-no-unknown` | 跟随预设 | CSS 使用语言模型识别工具类指令；SCSS / Vue 由预设关闭核心规则，使用 SCSS 插件校验 |
| `at-rule-prelude-no-invalid` | 按语法 | CSS / HTML 仅放宽 `@apply` 参数；SCSS / Vue 沿用预设关闭值 |
| `at-rule-no-deprecated` | `null` | 不重复报告废弃 at-rule |
| `font-family-no-missing-generic-family-keyword` | `null` | 不强制字体栈包含通用族 |
| `function-no-unknown` | `null` | 允许框架和预处理器函数 |
| `import-notation` | `null` | 不强制改写 import 写法 |
| `media-feature-range-notation` | `null` | 兼容现有媒体查询范围写法 |
| `named-grid-areas-no-invalid` | `null` | 不重复推断命名网格区域 |
| `nesting-selector-no-missing-scoping-root` | `null` | 兼容 Vue / SCSS 嵌套 |
| `no-descending-specificity` | `null` | 不跨组件推断选择器优先级 |
| `no-empty-source` | `null` | 允许构建入口决定空样式是否合法 |
| `no-invalid-position-declaration` | `null` | 允许现代 CSS 和预处理器声明位置 |
| `order/order` | 自定义顺序 | 变量、at-rule、声明和嵌套层级顺序 |
| `rule-empty-line-before` | 自定义 | 同层级规则块之间保留空行 |
| `selector-class-pattern` | 自定义 | 允许 BEM、状态和工具类命名 |
| `selector-not-notation` | `null` | 不强制改写 `:not()` |
| `selector-pseudo-class-no-unknown` | Vue 例外 | 允许 `:deep`、`:global` 和 `:slotted`，其他未知伪类仍会报错 |
| `selector-pseudo-element-no-unknown` | Vue 例外 | 允许 `v-deep`、`v-global`、`v-slotted` |

SCSS 专属规则：

| 规则 | 默认值 | 作用 |
| --- | --- | --- |
| `scss/at-rule-no-unknown` | 自定义例外 | 与 CSS 共享工具类 at-rule 例外 |
| `at-rule-empty-line-before` | 标准空行规则，忽略 `else` | 保留 Sass `} @else {` 写法 |
| `scss/operator-no-newline-after` | `null` | 不限制 SCSS 运算符后的换行 |

需要修改时只覆盖目标规则：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  rules: {
    'selector-class-pattern': null,
    'no-empty-source': true,
  },
})
```

Stylelint 的规则主选项取决于具体规则；例如 `no-empty-source` 使用 `true` 启用，而不是 ESLint 风格的 `'error'`。如需显式指定级别，使用 `[true, { severity: 'error' }]`。

## 执行与报告

共享配置使用以下默认值：

| 字段 | 默认值 | 含义 |
| --- | --- | --- |
| `allowEmptyInput` | `true` | glob 没有匹配文件时不让运行失败 |
| `cache` | `false` | 不自动使用缓存 |
| `fix` | `false` | 不自动写回修复结果 |
| `reportDescriptionlessDisables` | `true` + warning | 没有描述的 disable 注释报告 warning |
| `reportInvalidScopeDisables` | `true` + warning | 规则作用域无效时报告 warning |
| `reportNeedlessDisables` | `true` + warning | 已不需要的 disable 注释报告 warning |
| `reportUnscopedDisables` | `true` + warning | 未指定规则的 disable 注释报告 warning |

覆盖报告级别：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  reportNeedlessDisables: [true, { severity: 'error' }],
})
```

缓存和修复应由消费项目显式决定：

```bash
pnpm exec stylelint "**/*.{css,scss,vue,html}" \
  --config stylelint.config.ts \
  --cache \
  --cache-location node_modules/.cache/.stylelintcache

pnpm exec stylelint "**/*.{css,scss,vue,html}" \
  --config stylelint.config.ts \
  --fix
```

## 默认忽略

Tauri 默认只排除 `src-tauri/target` 编译与打包产物，以及 `src-tauri/gen` 下的 schema、Android 和 Apple 生成工程。这是 Stylelint 的检查范围，不是 Git 忽略策略；其他项目的 `target`、`gen` 与 `src-tauri/resources` 等手写资源仍会检查；自定义输出目录通过 `ignoreFiles` 追加。

默认 `ignoreFiles` 会根据 `process.cwd()` 生成消费项目根目录下的绝对路径，包含：

```text
**/node_modules/**
**/dist/**
**/build/**
**/src-tauri/target/**
**/src-tauri/gen/**
**/.nuxt/**
**/.turbo/**
**/.vercel/**
**/.wrangler/**
**/coverage/**
**/*.js
**/*.jsx
**/*.tsx
**/*.ts
**/*.json
**/*.md
```

这些文件交给 ESLint、TypeScript 或 Markdownlint；Stylelint 只负责样式文件。调用 `zzjtnb()` 时按本次调用的当前工作目录生成；原生 `extends` 使用的默认对象则在模块加载时生成。两者都不是相对于共享包目录生成。

追加项目目录：

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  ignoreFiles: [
    '**/generated/**',
    '**/public/assets/**',
  ],
})
```

`ignoreFiles` 在工厂中始终追加，传入空数组也不会移除共享忽略项。确需完全替换时，在工厂返回对象之后通过对象字段覆盖，并自行保留必要的生成物和依赖目录忽略规则。

## CLI 脚本

推荐使用样式文件 glob：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.ts --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint --fix"
  }
}
```

不要写成：

```json
{
  "scripts": {
    "lint:stylelint": "stylelint ."
  }
}
```

`stylelint .` 可能把不属于 Stylelint 的 JavaScript、TypeScript、JSON 或 Markdown 文件交给 CLI，造成无效输入或误导性的检查结果。

## 公共导出

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'
import type { Config } from '@zzjtnb/stylelint-config'

const config: Config = zzjtnb({
  rules: {
    'color-no-invalid-hex': true,
  },
})

export default config
```

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | runtime function | 创建 Stylelint `Config` |
| `default` | runtime value | `zzjtnb()` 的默认配置结果，供原生 `extends` 加载 |
| `Config` | type | 从 Stylelint 原样重新导出的原生类型 |

`Config` 就是 Stylelint 的原生类型。本包不定义冗长的私有配置类型别名。

## VS Code

使用 Stylelint 扩展时，关闭 VS Code 内置 CSS 校验，避免重复诊断；修复动作保持显式：

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

如果项目还使用 ESLint，ESLint 负责 JavaScript、TypeScript、Vue script 和配置文件，Stylelint 负责 Vue style block、CSS、SCSS 和 HTML 样式。

## 常见问题

### `Unknown rule: scss/...`

确认该文件是 `.scss` 或 `.vue`，并且使用了本包的 override。不要把 `scss/*` 规则手动放进全局 `rules` 后再让普通 CSS 加载它。

### 没有匹配文件却没有报错

共享默认值为 `allowEmptyInput: true`，适用于没有样式文件的 workspace 子包。命令成功不等于检查到了目标文件：先核对执行目录、glob 和忽略项；要求零匹配也失败的项目可通过 `zzjtnb({ allowEmptyInput: false })` 覆盖默认值。

### Vue 文件没有检查样式

确认 Stylelint glob 包含 `*.vue`，并且没有在 `ignoreFiles` 中忽略该文件。Vue 样式依赖 `postcss-html` 解析容器。

### `rpx` 被报告为未知单位

不要用自定义字符串规则替代 `languageOptions`。共享配置已经在默认 language model 中注册 `rpx`；如果消费项目覆盖了完整 `languageOptions`，需要自行保留该单位。

### 为什么 ignoreFiles 是绝对路径

共享配置可能从共享包目录加载。使用消费项目的 `process.cwd()` 生成绝对路径，可以避免把 `node_modules` 和构建目录错误地解析到共享包自身。

### 为什么 `fix` 没有自动修复

`fix` 默认是 `false`。通过 `--fix` 或本地配置显式开启，避免共享包在消费项目运行检查时修改文件。

### 为什么不能直接把 `languageOptions` 合并一项

工厂对其他字段执行整体替换，而不是深度合并。要修改嵌套语法模型，应完整提供需要保留的 `syntax`、at-rule 和单位定义。

## 通过明确文件验证解析和覆盖

当 Vue、SCSS 与 CSS 的表现不一致时，对同一个真实文件分别查看配置和诊断：

```bash
pnpm exec stylelint --print-config src/App.vue --config stylelint.config.ts
pnpm exec stylelint src/App.vue --config stylelint.config.ts
```

`--print-config` 用于定位 `customSyntax`、最终规则与 overrides，不执行浏览器渲染。CLI 结果通过后仍需独立检查真实页面，尤其是排序修复涉及层叠覆盖关系时。

## 一个可追踪的覆盖顺序示例

```ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    rules: { 'no-empty-source': true },
    overrides: [
      {
        files: ['legacy/**/*.scss'],
        rules: { 'no-empty-source': null },
      },
    ],
  },
  {
    overrides: [
      {
        files: ['legacy/strict/**/*.scss'],
        rules: { 'no-empty-source': true },
      },
    ],
  },
)
```

该示例先要求非空源码，再允许旧目录空文件，最后只收紧旧目录中的 strict 子目录。后续传参的顶层 `rules` 会再次作用于全部文件，因此不能把局部例外与后续全局覆盖的先后关系忽略掉。

## 语法支持不等于框架编译

允许 `@apply`、`@theme`、`rpx`，只是让 Stylelint 按共享语言模型和规则检查这些语法。它不会运行 UnoCSS、Tailwind、Sass 或 uni-app，也不会证明一个工具类存在、一个主题变量已声明，或最终浏览器支持该特性。

同样，`postcss-html` 负责从 Vue / HTML 中提取样式，不负责运行 Vue 编译器。`<style lang="less">` 不在本包默认声明的 SCSS 支持范围内；使用其他语言时，消费项目应显式接入对应解析器并验证，而不是把 parser 名字改成 SCSS 后继续使用。

## Node.js API 的诊断处理

通过 API 检查内存文本时，必须给出真实语义的 `codeFilename`，使文件级 overrides 能按扩展名匹配：

```ts
import stylelint from 'stylelint'
import { zzjtnb } from '@zzjtnb/stylelint-config'

const result = await stylelint.lint({
  code: '.card { color: #FFFFFF; }',
  codeFilename: 'sample.css',
  config: zzjtnb(),
  fix: true,
})

console.log(result.code, result.results)
```

这段代码修复内存中的文本，不会自动将输出写入 `sample.css`。消费者需区分解析错误、无效配置选项、普通规则诊断和文件被忽略；不能只看 `warnings.length === 0` 就报告“检查通过”。对修复后的最终文本重新检查，才能保证剩余诊断的位置与最终内容一致。

## 样式职责与可访问性边界

共享规则维护语法、命名和属性组织，不能证明颜色对比度、焦点可见性、响应式布局或交互可访问性满足要求。样式修复后保留真实页面验收，不以工具成功替代视觉与交互验证。

## 相关文档

- [快速开始](./quick-start)
- [ESLint 配置](./eslint)
- [Markdownlint 配置](./markdownlint)
