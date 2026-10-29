---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 快速开始
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: markdownlint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 0
---

# Markdownlint 快速开始

`@zzjtnb/markdownlint-config` 以 Markdownlint 默认规则为基础，只声明本项目差异。CLI2 负责扫描和修复，规则最终按 **上游默认 → 本项目规则 → 消费项目规则** 生效。

## 安装

CLI2 的运行环境要求与规则版本见[包的消费要求](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/README.zh-CN.md#环境要求与安装)。

```bash
# 安装 CLI2 与共享扫描、规则配置。
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

## 使用默认预设

默认推荐 `.markdownlint-cli2.mjs`，也支持 `.markdownlint-cli2.jsonc`。下列格式任选一种，不要同时保留多份 CLI2 配置。MJS 通过 `/config` 继承共享扫描选项和规则；JSONC 的 `extends` 仅继承规则，扫描选项需自行配置。CLI2 的 `.jsonc` 格式也支持不含注释的标准 JSON 内容。

::: code-group

```js [.markdownlint-cli2.mjs（共享扫描与规则）]
// /config 提供共享扫描选项，并继承包根入口的 JSONC 规则。
export { default } from '@zzjtnb/markdownlint-config/config'
```

```jsonc [.markdownlint-cli2.jsonc（仅继承规则）]
{
  // 读取项目的 Git 忽略声明。
  "gitignore": true,
  // JSONC 不继承 /config 的扫描选项，此处仅示例排除依赖和构建产物。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 继承共享规则，消费方按规则名追加覆盖。
  "config": {
    "extends": "@zzjtnb/markdownlint-config",
  },
}
```

:::

## 检查与修复

```bash
# 读取项目 CLI2 配置，检查适用的 Markdown 文件，不写回。
pnpm exec markdownlint-cli2 "**/*.md"
# 对相同范围应用引擎提供的自动修复。
pnpm exec markdownlint-cli2 --fix "**/*.md"
```

## 覆盖本项目规则

例如本项目默认不限制行长，消费方可以重新开启并指定阈值：

::: code-group

```js [.markdownlint-cli2.mjs（共享扫描与规则）]
import shared from '@zzjtnb/markdownlint-config/config'

export default {
  // 继承扫描范围等共享默认值，不复制通用忽略列表。
  ...shared,
  // 规则只放在 config 中，消费方同名值最后生效。
  config: {
    // 保留规则继承入口。
    ...shared.config,
    // 启用 MD013，将常规行长度设为 120 个字符。
    MD013: {
      // Markdownlint 原生规则选项，未列出的次级选项按该规则默认值处理。
      line_length: 120,
    },
  },
}
```

```jsonc [.markdownlint-cli2.jsonc（仅继承规则）]
{
  // 读取项目的 Git 忽略声明。
  "gitignore": true,
  // JSONC 不继承 /config 的扫描选项，此处仅示例排除依赖和构建产物。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 继承共享规则，消费方按规则名追加覆盖。
  "config": {
    "extends": "@zzjtnb/markdownlint-config",
    // 启用行长度检查，常规行长度上限为 120 个字符。
    "MD013": { "line_length": 120 },
  },
}
```

:::

需要仅继承规则、自定义规则模块或 API 检查时，见[详细配置](/markdownlint/configuration)。
