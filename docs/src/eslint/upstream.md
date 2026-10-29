---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 配置来源
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: eslint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 10
---

# ESLint 的默认配置来自哪里

## 默认包含什么

本包基于 @antfu/eslint-config，使用它提供的语言解析、推荐规则、导入排序和配置文件检查。你只需安装 eslint 和本包，不需要逐个安装已包含的插件。

本包默认开启 TypeScript、Vue、Vue 无障碍和 antislop 代码质量检查，并调整少量规则。UnoCSS 和额外的格式化工具需要手动启用，写法见[按需扩展](/eslint/presets#按需扩展)。

另外，本包默认检查导入后缀是否与源码一致。shadcn 插件已注册，但不会自动开启全部规则。

## 想改一条规则，应该写在哪里

在 zzjtnb() 的 rules 中填写项目规则即可覆盖默认值。只想修改某种语言的设置，可以使用对应的 vue.overrides、javascript.overrides 等选项；只想修改部分文件，则追加带 files 的配置对象。

配置按以下顺序处理，后面的同名规则优先：

1. antfu 提供的基础配置。
2. 本包的默认调整。
3. 你在第一个参数中填写的 rules。
4. 你在后续参数中追加的配置。

只有匹配当前文件的配置会参与检查。完整示例见[详细配置](/eslint/configuration)，本包调整了哪些规则见[默认规则](/eslint/presets)。

## 参考文档

- [ESLint 配置对象与数组](https://eslint.org/docs/latest/use/configure/configuration-files)
- [ESLint 合并配置](https://eslint.org/docs/latest/use/configure/combine-configs)
- [antfu 配置和自定义入口](https://github.com/antfu/eslint-config)
- [本项目公开入口源码](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/src/index.ts)
- [本项目配置工厂](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/src/factory.ts)
