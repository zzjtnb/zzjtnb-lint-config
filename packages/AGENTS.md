# 公开配置包维护约定

本目录只容纳 ESLint、Stylelint、Markdownlint 三个对外发布的配置包。README 面向消费方，工程维护要求归本文件；不能把本仓库开发环境的 Node.js 26 要求复制成公开包的消费方 engines。

两个 TypeScript 配置包使用各自的 `tsdown.config.ts` 管理 JavaScript 与声明产物。`tsconfig.json` 只检查源码、构建配置与包内测试，不由 tsc 另写一套 dist。保持运行时依赖为外部导入，尤其不要内联 ESLint / Stylelint 的插件与解析器以制造第二份实例。

现有公开 `exports` 为 `dist/index.mjs` 与 `dist/index.d.ts`；tsdown 显式输出对应后缀。`.mjs` 是既有发布入口契约，不代表源码也要使用特殊后缀：普通 JavaScript / TypeScript 源码沿用 `.js` / `.ts`。改变发布入口须沿实际消费范围另行核对，不能只为后缀统一直接重写生成物或发布契约。

Markdownlint 直接导出 JSONC，无构建步骤。规则解释和官方规则链接集中维护于 `index.jsonc`，双语 README 说明原生继承、覆盖及自定义规则接入，不复制另一份默认规则表。

ESLint 包的上游是 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)：选项、覆盖优先级和默认集成以其官方 README 与已安装版本的源码为准。README 与站点只写本包自身的行为；ESLint、Node.js 等其他工具的前置要求不归本包说明，不得凭推断或二手经验写入。确需记录此类前提时，先在根目录用真实命令验证，并区分“由哪个工具要求”与“当前环境是否被间接依赖满足”，再写入。

Stylelint 的规则按跨语法共享约定、CSS / HTML 专属调整、SCSS 语法调整与排序职责维护在 `src/rules/`，配置层只组装预设、文件匹配与语言扩展，不按单条规则拆文件，也不复制上游规则表。插件由提供它的 preset 注册，本包声明必要依赖；调整插件接入须验证真实诊断与自动修复，不以配置对象里出现插件名代替。规则注释应交代与上游的差异、适用文件及关闭或放宽的原因，尤其标明顶层规则覆盖文件级 preset 的优先级边界。

在仓库根目录执行已安装工具的检查命令，不运行打包或发布：

```bash
pnpm exec tsc --noEmit -p packages/eslint-config/tsconfig.json
pnpm exec tsc --noEmit -p packages/stylelint-config/tsconfig.json
pnpm exec vitest run tests/integration/package-configs.test.ts --project integration
pnpm exec eslint packages --fix --max-warnings 0
```

配置契约测试只解析配置，包入口测试只覆盖现有 dist；二者都不等于最新源码对应的发布产物已经生成并验证。构建、打包、发布必须按当前授权执行，不以发布脚本的存在作为执行授权。
