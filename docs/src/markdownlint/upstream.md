---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 配置来源
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: markdownlint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 10
---

# Markdownlint 的默认配置来自哪里

## 默认包含什么

Markdownlint 负责检查文档内容；markdownlint-cli2 负责查找文件、读取忽略配置、加载自定义规则和保存修复结果。

本包基于 Markdownlint 的默认规则，只调整[预设页](/markdownlint/presets)列出的设置。没有列出的规则继续使用 Markdownlint 默认值。

## 选择哪种配置方式

| 需要做什么 | 使用哪个入口 |
| --- | --- |
| 使用共享规则，并复用文件扫描和忽略设置 | 在 .markdownlint-cli2.mjs 中加载 @zzjtnb/markdownlint-config/config |
| 只继承规则，自己决定扫描哪些文件 | 在 config.extends 中填写 @zzjtnb/markdownlint-config |
| 只让编辑器检查文档 | 按编辑器要求继承包根入口的规则 |

完整接入方式见[快速开始](/markdownlint)。只继承规则不会带入文件扫描和忽略设置。

## 如何覆盖规则

先 extends 共享规则，再填写同名规则。例如本包不限制行长，你可以在项目中启用 MD013 并设置 line_length。规则选项会整体替换，请填写这条规则需要的完整选项。

如果同一目录还保留 .markdownlint.* 文件，它可能覆盖 CLI2 中的规则设置。修改不生效时，先检查是否存在这类旧配置；具体示例见[详细配置](/markdownlint/configuration)。

## 参考文档

- [Markdownlint 原生配置](https://github.com/DavidAnson/markdownlint#configuration)
- [Markdownlint 规则清单](https://github.com/DavidAnson/markdownlint/blob/main/doc/Rules.md)
- [CLI2 配置选项](https://github.com/DavidAnson/markdownlint-cli2#configuration)
- [共享规则源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/index.jsonc)
- [共享扫描入口源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/markdownlint/src/index.ts)
