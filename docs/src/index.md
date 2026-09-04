---
layout: home

hero:
  name: zzjtnb-lint-config
  text: 一套规则，专注交付
  tagline: 为 TypeScript、Vue、样式和文档建立一致的工程规范。从首次接入到规则排障，每一步都有清楚的依据。
  image:
    src: /logo.svg
    alt: zzjtnb-lint-config
  actions:
    - theme: brand
      text: 开始接入
      link: /quick-start
    - theme: alt
      text: 查看源码
      link: https://github.com/zzjtnb/zzjtnb-lint-config

features:
  - icon:
      src: https://api.iconify.design/logos/eslint.svg
      alt: ESLint
      width: 32
      height: 32
      wrap: true
    title: ESLint
    details: 基于 antfu 的 Flat Config，覆盖 TypeScript、Vue 与工程配置。保留文件作用域，只声明项目需要的差异。
    link: /eslint
    linkText: 配置与规则
  - icon:
      light: https://api.iconify.design/logos/stylelint.svg?color=%23344054
      dark: https://api.iconify.design/logos/stylelint.svg?color=%23d0d5dd
      alt: Stylelint
      width: 32
      height: 32
      wrap: true
    title: Stylelint
    details: 使用原生 Config 管理 CSS、SCSS 和 Vue 样式。明确语法范围、覆盖顺序及工具类框架扩展。
    link: /stylelint
    linkText: 样式检查指南
  - icon:
      light: https://api.iconify.design/logos/markdown.svg?color=%23344054
      dark: https://api.iconify.design/logos/markdown.svg?color=%23d0d5dd
      alt: Markdown
      width: 32
      height: 32
      wrap: true
    title: Markdownlint
    details: 通过原生 extends 继承文档规则。扫描范围和修复策略由项目掌握，自定义规则有完整接入示例。
    link: /markdownlint
    linkText: 文档规范指南
---
