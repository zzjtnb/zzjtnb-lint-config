---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 配置来源
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: stylelint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 10
---

# Stylelint 的默认配置来自哪里

## 默认包含什么

本包组合了以下预设，并补充 Vue、工具类指令和 rpx 支持：

| 预设 | 用途 |
| --- | --- |
| stylelint-config-standard | CSS 推荐规则 |
| stylelint-config-recess-order | CSS 属性排序 |
| stylelint-config-recommended-scss | SCSS 规则与语法支持 |
| stylelint-config-recommended-vue/scss | Vue style 中的 CSS、SCSS 规则 |

解析器和插件已随本包提供。安装 stylelint 和本包即可使用，无需再单独安装这些预设。

## 如何修改默认设置

推荐调用 zzjtnb()，在 rules 中填写你想改变的规则。这样填写的同名规则会覆盖本包在 CSS、SCSS、Vue 等文件中的默认值。

需要只修改部分文件时，在 overrides 中填写 files 和 rules。多个参数从左到右处理，后面的同名规则优先；当前参数中的文件级 overrides 优先于它的全局 rules。

你也可以使用 Stylelint 原生 extends 继承本包。原生写法由 Stylelint 自己合并配置，不会调用 zzjtnb() 的合并逻辑。两种方式的示例见[详细配置](/stylelint/configuration)。

## 参考文档

- [Stylelint 配置与继承](https://stylelint.io/user-guide/configure/)
- [CSS 标准预设](https://github.com/stylelint/stylelint-config-standard)
- [SCSS 推荐预设](https://github.com/stylelint-scss/stylelint-config-recommended-scss)
- [Vue 推荐预设](https://github.com/ota-meshi/stylelint-config-recommended-vue)
- [recess-order 属性排序预设](https://github.com/stormwarning/stylelint-config-recess-order)
- [本项目工厂源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/stylelint/src/factory.ts)
