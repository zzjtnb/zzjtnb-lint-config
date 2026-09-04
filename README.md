# zzjtnb-lint-config

[![@zzjtnb/eslint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/eslint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/eslint-config) [![@zzjtnb/stylelint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/stylelint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/stylelint-config) [![@zzjtnb/markdownlint-config 版本](https://npmx.dev/api/registry/badge/version/@zzjtnb/markdownlint-config?name=true&style=shieldsio&labelColor=080f12&color=1fa669)](https://npmx.dev/package/@zzjtnb/markdownlint-config) [![许可证](https://img.shields.io/github/license/zzjtnb/zzjtnb-lint-config?labelColor=080f12&color=1fa669)](./LICENSE)

面向现代前端项目的 ESLint,Stylelint 与 Markdownlint 共享配置.一次安装,让 TypeScript,Vue,样式和文档共用同一套代码规范.

完整文档:<https://lint.docs.zzjtnb.com/>

## 包

| 包 | 用途 | 工具版本 |
| --- | --- | --- |
| [`@zzjtnb/eslint-config`](./packages/eslint-config/README.md) | 基于 [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) 的 Flat Config,覆盖 TypeScript,Vue,JSON,YAML,TOML,Markdown 与 pnpm 工作区 | ESLint 10 |
| [`@zzjtnb/stylelint-config`](./packages/stylelint-config/README.md) | CSS,SCSS,Vue SFC,HTML,兼容 UnoCSS,Tailwind 风格指令与 uni-app 的 `rpx` | Stylelint 17 |
| [`@zzjtnb/markdownlint-config`](./packages/markdownlint-config/README.md) | 带逐条规则说明的 JSONC,支持原生 `extends` 与项目自定义规则 | markdownlint-cli2 |

`eslint`,`stylelint` 和 `markdownlint-cli2` 由你的项目安装;解析器,预设和插件由配置包自身管理,不需要重复安装.

## 快速开始

### ESLint

```bash
pnpm add -D eslint @zzjtnb/eslint-config
```

```ts
// eslint.config.ts
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb()
```

### Stylelint

```bash
pnpm add -D stylelint @zzjtnb/stylelint-config
```

```ts
// stylelint.config.ts
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb()
```

### Markdownlint

```bash
pnpm add -D markdownlint-cli2 @zzjtnb/markdownlint-config
```

```jsonc
// .markdownlint-cli2.jsonc
{
  "gitignore": true,
  "ignores": ["**/node_modules/**", "**/dist/**"],
  "config": {
    "extends": "@zzjtnb/markdownlint-config"
  }
}
```

选项,规则覆盖,忽略项和脚本写法见各包的 README 与[快速开始](https://lint.docs.zzjtnb.com/quick-start).

## Playground 工作台

Playground 是独立的 Vite 应用,提供真实引擎检查,自动修复,配置草稿,规则查询与分享.当前检查能力依赖本地 Node.js 开发服务,本地启动后访问 <http://localhost:3001/>.启动方式与使用限制见 [工作台 README](./playground/README.md).

## 文档

完整文档见 <https://lint.docs.zzjtnb.com/>，包含[快速开始](https://lint.docs.zzjtnb.com/quick-start)、ESLint、Stylelint、Markdownlint 规则指南及依赖版本管理。

## 本地开发

环境要求以根 `package.json` 的 `engines` 与 `packageManager` 为准.

```bash
pnpm install
```

| 命令 | 作用 |
| --- | --- |
| `pnpm lint` | 检查 ESLint,Stylelint 与 Markdown,不修改文件 |
| `pnpm format` | 同上并自动修复,会写回文件 |
| `pnpm typecheck` | 类型检查 |
| `pnpm test` | 运行全部测试 |
| `pnpm build` | 构建各 workspace 中定义了构建脚本的包 |

开发服务统一从 3000 开始分配(文档站为 3000,Playground 为 3001),端口被占用时会直接报错,不会改用其他端口;端口分别由各自的 Vite 配置维护.

仓库只有上表三个包对外发布,其余 workspace 仅供工程内部使用,不属于公开 API.

## 发布

```bash
pnpm release
```

脚本的菜单,版本处理,检查范围与恢复步骤见[当前发布流程](./apps/handbook/当前发布流程.md),手动发布见[原始发布流程](./apps/handbook/原始发布流程.md),常见问题见[发布常见问题](./apps/handbook/发布常见问题.md).脚本不会自动 commit,tag 或 push.

## 许可证

[MIT](./LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
