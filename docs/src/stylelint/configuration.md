---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 详细配置
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: stylelint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 30
---

# Stylelint 详细配置

本页说明公开工厂参数、配置合并顺序和按文件覆盖方式。默认接入见[快速开始](/stylelint)，配置来源见[配置来源](/stylelint/upstream)，默认差异见[本项目预设](/stylelint/presets)。

## 完整配置示例

项目声明 `"type": "module"` 后使用 `stylelint.config.js`。下面展示共享工厂的主要配置与后续文件片段；注释区分默认行为和本例覆盖。共享 preset、parser、通用忽略及规则不需要重新抄写。

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    // 只追加项目独有目录；共享默认已排除备份、构建及 Playwright 报告与附件。
    ignoreFiles: ['**/generated/**'],
    // 默认 true，允许没有样式文件的子项目；false 要求实际匹配输入。
    allowEmptyInput: false,
    // 普通规则默认 error；单条规则的 severity 可覆盖该默认值。
    defaultSeverity: 'error',
    // 默认 false：仍报告 warning；true 仅保留 error 级问题。
    quiet: false,
    // 默认 false：允许合法的 stylelint-disable 注释生效。
    ignoreDisables: false,
    // 默认使用 stylelint-disable 作为配置注释前缀。
    configurationComment: 'stylelint',
    // 以下四项共享默认均为 true + warning；本例保留并展示参数形式。
    reportDescriptionlessDisables: [true, { severity: 'warning' }],
    reportInvalidScopeDisables: [true, { severity: 'warning' }],
    reportNeedlessDisables: [true, { severity: 'warning' }],
    reportUnscopedDisables: [true, { severity: 'warning' }],
    // 默认不限制 warning 数量；此例要求没有 warning，规则本身仍会正常报告。
    maxWarnings: 0,
    // rules 仅放项目覆盖；本例重新启用共享默认关闭的空文件检查。
    rules: { 'no-empty-source': true },
  },
  {
    // 后续参数仍是原生 Config；其规则与文件例外在前一段之后生效。
    overrides: [
      {
        // 仅允许该目录中的样式文件为空，不影响其他项目文件。
        files: ['legacy/**/*.css'],
        // null 使用 Stylelint 原生语义关闭规则。
        rules: { 'no-empty-source': null },
      },
    ],
  },
)
```

本例不设置 `fix`、`cache`：默认只检查、不写回；通过 CLI 的 `--fix` 请求修复，通过 `--cache` 启用缓存，缓存位置在脚本维护。共享包不替消费方决定执行策略。

## 配置字段与用途

| 字段 | 用途及默认行为 | 本包的合并方式 |
| --- | --- | --- |
| `rules` | 按规则名指定主选项、例外和 severity；未覆盖时继承共享值 | 同名后置覆盖，并应用到之前的文件默认值之后 |
| `ignoreFiles` | 追加项目排除；通用生成物由共享配置提供 | 数组追加，空数组不清除默认值 |
| `overrides` | 用 files / excludedFiles 为文件提供局部规则 | 按顺序追加 |
| `extends` | 追加其他共享配置；本包默认的 standard、SCSS、Vue、排序 preset 已提供 | 按顺序追加，不必重复声明 |
| `plugins` | 追加项目自己的规则插件；已有插件由 preset 注册 | 按顺序追加 |
| `customSyntax` | 显式选择自定义语法；默认按 CSS、SCSS、Vue、HTML 文件选择 | 整体替换；新增语言才按需提供 |
| `languageOptions` | 扩展语法模型；共享模型包含工具类指令和 rpx | 整体替换，不做深度合并 |
| `defaultSeverity` | 默认 error，单条规则可覆盖 | 后置替换 |
| `report*Disables` | 检查缺少原因、无效范围、不必要或全局禁用；共享默认 warning | 后置替换 |
| `ignoreDisables` | 默认 false；true 时不让禁用注释抑制规则诊断 | 后置替换 |
| `configurationComment` | 默认 stylelint，修改配置注释前缀 | 后置替换 |
| `allowEmptyInput` | 本包默认 true；false 要求有匹配文件 | 后置替换，不用于文件 override |
| `fix`、`cache` | 工具默认 false；建议由脚本或 CLI 控制 | 后置替换，不用于文件 override |
| `quiet`、`maxWarnings`、`formatter` | 控制终端诊断、warning 上限与输出格式，不是规则配置 | 后置替换 |
| `processors`、`referenceFiles` | Stylelint 的实验性处理与参考文件能力；本包不默认启用 | 使用当前上游契约，按实际需求设置 |

## 原生继承

不需要工厂的合并能力时，直接使用 Stylelint 原生 extends：

```js [stylelint.config.js]
export default {
  // 加载本包默认对象，由 Stylelint 自己处理继承顺序。
  extends: ['@zzjtnb/stylelint-config'],
  // 原生继承后按规则名覆盖；不运行本包的多参数合并函数。
  rules: { 'no-empty-source': true },
}
```

## 工厂签名

```ts
function zzjtnb(config?: Config, ...configs: Config[]): Config
```

每个参数都是一个 Stylelint `Config` 对象，只需填写你要修改的字段：

```js [stylelint.config.js]
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

工厂不会重新命名 Stylelint 字段，也不会把 `Config` 包装成私有的 `StylelintConfigOptions` 或执行选项类型。

## 合并行为

工厂从本包默认配置开始，再依次处理第一个参数和每一个后续片段：

| 字段 | 合并行为 |
| --- | --- |
| `rules` | 按规则名合并，同时覆盖此前文件配置中的同名规则；随后追加当前参数的文件例外 |
| `extends` | 按顺序追加 |
| `plugins` | 按顺序追加 |
| `ignoreFiles` | 按顺序追加 |
| `overrides` | 按顺序追加 override 对象 |
| 其他字段，包括 `languageOptions` | 后面的字段整体替换前面的字段 |

这不是深度合并：

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 描述当前输入的语言语法与解析能力，供对应规则判断合法语法。
  languageOptions: {
    // 扩展 Stylelint 可识别的语言语法；由 languageOptions 或工厂的同名入口承载。
    syntax: {
      // 按单位维度声明额外合法单位，供相关语法检查使用。
      units: {
        // 示例额外识别 upx；标准单位 vw 无需登记，本包默认已提供 rpx。
        length: ['upx'],
      },
    },
  },
})
```

上面的 `languageOptions` 会替换共享的完整 language model。它不会自动保留共享配置中的 at-rule 列表；如果需要保留共享语法能力，应在本地完整声明，或只使用原有 `languageOptions` 并通过规则字段进行调整。

规则同名覆盖示例：

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
  rules: {
    // 只覆盖这一条，其他共享规则继续生效。
    'declaration-no-important': null,
  },
})
```

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

## CLI 脚本

推荐使用样式文件 glob：

```json [package.json]
{
  "scripts": {
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache",
    "format:stylelint": "pnpm run lint:stylelint --fix"
  }
}
```

### package.json 字段说明

上面的 package.json 示例使用严格 JSON，各字段用途如下：

| 字段 | 用途与生效条件 |
| --- | --- |
| `scripts` | 将命令声明为 pnpm run 入口；未声明的脚本不能通过 pnpm run 调用。 |
| `scripts.lint:stylelint` | 执行对应检查范围；不加 --fix 时只报告问题，不写回文件。 |
| `scripts.format:stylelint` | 复用检查入口并追加 --fix，会自动写回可修复的文件。 |

不要写成：

```json [package.json]
{
  "scripts": {
    "lint:stylelint": "stylelint ."
  }
}
```

`stylelint .` 可能把不属于 Stylelint 的 JavaScript、TypeScript、JSON 或 Markdown 文件交给 CLI，造成无效输入或误导性的检查结果。

## 公共导出

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'
/** @type {import('@zzjtnb/stylelint-config').Config} */
const config = zzjtnb({
  // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
  rules: {
    // 检查十六进制颜色是否合法，true 开启，null 关闭。
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

同时使用 ESLint、Stylelint 和 Markdownlint 时，保存修复与语言分工统一见[三工具编辑器设置](/quick-start#编辑器配置)。关闭重复的保存格式化，三个工具均使用 explicit 修复动作。

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

共享配置可能从共享包目录加载。使用消费项目的 `process.cwd()` 生成绝对路径，可以避免把本包追加的构建目录等忽略模式错误地解析到共享包自身。`node_modules` 由 Stylelint 原生忽略，不需要本包重复声明。

### 为什么 `fix` 没有自动修复

`fix` 默认是 `false`。通过 `--fix` 或本地配置显式开启，避免共享包在消费项目运行检查时修改文件。

### 为什么不能直接把 `languageOptions` 合并一项

工厂对其他字段执行整体替换，而不是深度合并。要修改嵌套语法模型，应完整提供需要保留的 `syntax`、at-rule 和单位定义。

## 通过明确文件验证解析和覆盖

当 Vue、SCSS 与 CSS 的表现不一致时，对同一个真实文件分别查看配置和诊断：

```bash
# 输出指定文件实际合并后的 Stylelint 配置，用于核对匹配结果。
pnpm exec stylelint --print-config src/App.vue --config stylelint.config.js
# 检查指定样式文件，按实际配置解析 CSS、SCSS 或 Vue。
pnpm exec stylelint src/App.vue --config stylelint.config.js
```

`--print-config` 用于定位 `customSyntax`、最终规则与 overrides，不执行浏览器渲染。CLI 结果通过后仍需独立检查真实页面，尤其是排序修复涉及层叠覆盖关系时。

## 一个可追踪的覆盖顺序示例

```js [stylelint.config.js]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb(
  {
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
      'no-empty-source': true,
    },
    // 按所属配置分组或文件范围覆盖已有选项，保留未列出的默认规则。
    overrides: [
      {
        // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
        files: ['legacy/**/*.scss'],
        // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
        rules: {
          // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
          'no-empty-source': null,
        },
      },
    ],
  },
  {
    // 按所属配置分组或文件范围覆盖已有选项，保留未列出的默认规则。
    overrides: [
      {
        // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
        files: ['legacy/strict/**/*.scss'],
        // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
        rules: {
          // 控制空样式输入的诊断；null 表示关闭这条 Stylelint 规则。
          'no-empty-source': true,
        },
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
  // 传入待检查的源码字符串，而非让 API 从磁盘查找文件。
  code: '.card { color: #FFFFFF; }',
  // 为字符串输入提供文件路径语境，使解析器和文件覆盖按扩展名生效。
  codeFilename: 'sample.css',
  // 使用共享 Stylelint 工厂返回的完整配置检查当前输入。
  config: zzjtnb(),
  // 启用自动修复；只处理规则实际提供的修复，仍须检查剩余诊断。
  fix: true,
})

console.log(result.code, result.results)
```

这段代码修复内存中的文本，不会自动将输出写入 `sample.css`。消费者需区分解析错误、无效配置选项、普通规则诊断和文件被忽略；不能只看 `warnings.length === 0` 就报告“检查通过”。对修复后的最终文本重新检查，才能保证剩余诊断的位置与最终内容一致。

## 样式职责与可访问性边界

共享规则维护语法、命名和属性组织，不能证明颜色对比度、焦点可见性、响应式布局或交互可访问性满足要求。样式修复后保留真实页面验收，不以工具成功替代视觉与交互验证。

## 相关文档

- [快速开始](/quick-start)
- [ESLint 配置](/eslint)
- [Markdownlint 配置](/markdownlint)
