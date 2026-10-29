# zzjtnb-lint-config

[![@zzjtnb/eslint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![@zzjtnb/stylelint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/stylelint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![@zzjtnb/markdownlint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/markdownlint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![许可证](https://img.shields.io/github/license/zzjtnb/zzjtnb-lint-config?labelColor=080f12&color=1fa669)](./LICENSE)

面向现代前端项目的 ESLint,Stylelint 与 Markdownlint 共享配置.一次安装,让 TypeScript,Vue,样式和文档共用同一套代码规范.

完整文档:<https://lint.docs.zzjtnb.com/>

## 包

| 包 | 用途 | 工具版本 |
| --- | --- | --- |
| [`@zzjtnb/eslint-config`](./packages/eslint/README.md) | 基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 Flat Config,覆盖 TypeScript,Vue,JSON,YAML,TOML,Markdown 与 pnpm 工作区 | ESLint 10 |
| [`@zzjtnb/stylelint-config`](./packages/stylelint/README.md) | CSS,SCSS,Vue SFC,HTML,兼容 UnoCSS,Tailwind 风格指令与 uni-app 的 `rpx` | Stylelint 17 |
| [`@zzjtnb/markdownlint-config`](./packages/markdownlint/README.md) | 带逐条说明的 JSONC 规则与 ESM 扫描配置，支持原生继承与项目覆盖 | markdownlint-cli2 |

`eslint`,`stylelint` 和 `markdownlint-cli2` 由你的项目安装;解析器,预设和插件由配置包自身管理,不需要重复安装.

## 快速开始

### ESLint

```bash
# 安装 ESLint 工具与共享配置。
pnpm add -D eslint @zzjtnb/eslint-config
```

```js
// eslint.config.js
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

### Stylelint

```bash
# 安装 Stylelint 工具与共享配置。
pnpm add -D stylelint @zzjtnb/stylelint-config
```

```js
// stylelint.config.js
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

### Markdownlint

```bash
# 安装 Markdownlint 工具与共享配置。
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

```js
// .markdownlint-cli2.mjs：复用共享扫描默认值与规则，不重复抄写排除列表。
export { default } from '@zzjtnb/markdownlint-config/config'
```

选项,规则覆盖,忽略项和脚本写法见各包的 README 与[快速开始](https://lint.docs.zzjtnb.com/quick-start).

## Playground 工作台

Playground 是独立的纯静态配置实验台，支持配置与规则检查、工作区文件匹配、浏览器内真实检查和修复、性能分析及完整配置导出，不依赖本地运行器或检查后端。启动与部署方式见[工作台 README](./playground/README.md)。

## 文档

完整文档见 <https://lint.docs.zzjtnb.com/>，包含[快速开始](https://lint.docs.zzjtnb.com/quick-start)、ESLint、Stylelint、Markdownlint 规则指南及依赖版本管理。

## 本地开发

脚本的命名、排列与使用条件见[项目脚本](./docs/src/engineering/scripts.md)。

环境要求以根 `package.json` 的 `engines` 与 `packageManager` 为准.

```bash
# 首次准备仓库或本仓库依赖清单变化时安装；日常源码修改不需要重复安装。
pnpm install
```

| 命令 | 作用 |
| --- | --- |
| `pnpm lint` | 检查 ESLint,Stylelint 与 Markdown,不修改文件 |
| `pnpm format` | 同上并自动修复,会写回文件 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 运行源码、集成及现有包入口测试，浏览器测试单独运行 |
| `pnpm build` | 按依赖顺序构建公开配置包、Docs 与 Playground |

根 `pnpm dev` 会监听三个配置包源码并更新 dist，同时启动 Docs 和 Playground。已通过 `link:` 接入的外部项目在构建完成后重跑检查即可读取修改，无需逐个重新安装；首次建链及依赖变化的处理见[本地联调指南](./docs/src/engineering/debugging.md#local-link)。

根 `pnpm dev` 通过 `predev` 先清理项目端口；自定义端口可运行 `pnpm ports 4000 5000`，行为见[端口脚本](./scripts/ports/README.md)。开发服务统一从 3000 开始分配(文档站为 3000,Playground 为 3001),端口被占用时会直接报错,不会改用其他端口;端口分别由各自的 Vite 配置维护.

Docs、Playground 和 apps/handbook 共用根目录检查与格式化入口；apps/demo 保留独立消费示例配置。

仓库只有上表三个包对外发布,其余 workspace 仅供工程内部使用,不属于公开 API.

## 发布

```bash
# 启动仓库交互发布流程，逐步确认范围、版本、检查与上传。
pnpm release
```

脚本的菜单,版本处理,检查范围与恢复步骤见[当前发布流程](./apps/handbook/当前发布流程.md),手动发布见[原始发布流程](./apps/handbook/原始发布流程.md),常见问题见[发布常见问题](./apps/handbook/发布常见问题.md).脚本不会自动 commit,tag 或 push.

## 许可证

[MIT](./LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
