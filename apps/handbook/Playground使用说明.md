# Playground 维护说明

工作台的运行、功能边界、验证和静态部署条件统一见 [Playground README][readme]；设计与执行边界见[方案](./playground/design.md)。

## 维护入口

浏览器页面通过 Hash 路由进入六个视图。`App.vue` 仅承载路由出口，布局维护公共导航；配置和实验状态分属 Pinia 领域，不在视图中复制配置草稿。

构建流程和数据归属见[工程脚本说明][scripts]。生成资料与沙箱运行时资源均随站点发布，不通过业务 HTTP 接口获取，也不把构建机项目文件列为访问者的本机文件。

配置目录与最终解析结果、原始来源声明与实际匹配、静态元数据与当前草稿分别展示。规则缺少官方属性时保持未知；Stylelint 与 Markdownlint 不伪造 ESLint 式来源链或逐规则统计。

[readme]: ../../playground/README.md
[scripts]: ../../playground/scripts/README.md

内部验收记录见 [验证记录](./playground/verification.md)。
