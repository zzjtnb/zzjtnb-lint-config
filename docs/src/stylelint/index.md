---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 快速开始
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: stylelint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 0
---

# Stylelint 快速开始

Stylelint 检查样式中的错误与约定，并提供部分自动修复。CSS、SCSS 和 Vue 样式需要对应的解析器与规则，本包已组合这些支持。

- [Stylelint 官方入门](https://stylelint.io/user-guide/get-started/)：了解安装、配置和首次检查。
- [Stylelint 在线演示](https://stylelint.io/demo/)：用样式片段尝试规则与修复。
- [Stylelint 规则清单](https://stylelint.io/user-guide/rules/)：查询核心规则的用途、选项和自动修复能力。

在线演示不会自动加载本包的 SCSS、Vue 预设或项目配置；涉及这些文件时，以消费项目的实际检查结果为准。SCSS 插件规则应查对应插件说明。

`@zzjtnb/stylelint-config` 继承官方 CSS、SCSS、Vue 相关预设，只追加本项目的语法与规则差异。最终优先级是 **上游预设 → 本项目预设 → 消费项目配置**。

## 安装

环境和兼容引擎范围见[包的消费要求](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint/README.zh-CN.md#环境要求与安装)。

```bash
# 安装 Stylelint 引擎及共享样式配置。
pnpm add -D stylelint @zzjtnb/stylelint-config
```

## 使用默认预设

在项目根目录创建 `stylelint.config.js`，并在 `package.json` 中声明 `"type": "module"`。直接使用 ESM 配置，不需要 TypeScript 配置加载器或额外运行 flag。未声明 ESM 的项目可使用 `.mjs`，不要同时保留多份配置。

::: code-group

```js [stylelint.config.js（工厂）]
import { zzjtnb } from '@zzjtnb/stylelint-config'

// 工厂返回 Stylelint 原生配置对象，包含按文件生效的语法预设。
export default zzjtnb()
```

```js [stylelint.config.js（原生继承）]
export default {
  // 通过 Stylelint 原生入口继承共享配置。
  extends: ['@zzjtnb/stylelint-config'],
}
```

:::

## 检查与修复

```bash
# 检查 CSS、SCSS、Vue 与 HTML 样式，不写回文件。
pnpm exec stylelint "**/*.{css,scss,vue,html,htm}"
# 对同一文件范围应用 Stylelint 能提供的自动修复。
pnpm exec stylelint "**/*.{css,scss,vue,html,htm}" --fix
```

## 覆盖本项目规则

类名命名约束继承上游 standard 预设，本包不重复定义。消费方可以关闭这条继承规则，其他规则继续生效：

::: code-group

```js [stylelint.config.js（工厂）]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 同名规则覆盖共享值，不需要重写上游 presets 或 parser。
  rules: {
    // null 按 Stylelint 原生语义关闭此规则。
    'selector-class-pattern': null,
  },
})
```

```js [stylelint.config.js（原生继承）]
export default {
  // 通过 Stylelint 原生入口继承共享配置。
  extends: ['@zzjtnb/stylelint-config'],
  // 消费方同名规则覆盖继承值。
  rules: {
    // null 按 Stylelint 原生语义关闭类名约束。
    'selector-class-pattern': null,
  },
}
```

:::

原生 extends、后续配置参数和文件级例外见[详细配置](/stylelint/configuration)。
