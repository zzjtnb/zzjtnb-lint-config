# zzjtnb-lint-config

面向现代前端项目的 lint 配置工作区，集中维护 ESLint、Stylelint 和 Markdownlint 相关配置。

## 发布包

| 包名 | 说明 |
| --- | --- |
| [`@zzjtnb/eslint-config`](./packages/eslint-config/README.md) | 基于 `@antfu/eslint-config` 的 ESLint 10 Flat Config 共享配置。 |
| [`@zzjtnb/stylelint-config`](./packages/stylelint-config/README.md) | 面向 CSS、SCSS、Vue SFC、UnoCSS、Tailwind 风格工作流和 uni-app 的 Stylelint 17 共享配置。 |

## 工作区结构

```text
packages/
  eslint-config/        # @zzjtnb/eslint-config 发布包
  stylelint-config/     # @zzjtnb/stylelint-config 发布包
tests/
  integration/          # 配置加载集成测试
scripts/
  release.js            # 交互式 npm 发布流程
```

## 约定

- 使用 `pnpm` 管理依赖和 workspace。
- 根目录脚本只负责委托 Turborepo，具体任务放在 workspace 包内。
- `lint` 只检查，不修改文件；`format` 才执行自动修复，并尽量启用工具自身缓存。
- Markdownlint 检查根 README、仓库维护文档和发布包 README，确保 npm 展示文档也保持可维护。

## 常用命令

```bash
# 安装依赖。
pnpm install

# 执行全部 lint，不修改文件。
pnpm lint

# 执行全部格式修复。
pnpm format

# 只执行 Markdownlint。
pnpm lint:markdownlint

# 执行类型检查。
pnpm typecheck

# 执行构建检查。
pnpm build

# 执行测试。
pnpm test

# 执行发布前检查。
pnpm release:check

# 交互式发布：登录检查、版本检查、完整校验、打包和逐包发布。
# 发布成功后立即结束，不等待 npm registry 同步；脚本会输出页面和检查命令。
# npm 启用 2FA 时，发布命令会在当前终端中提示输入 OTP。
pnpm release

# 预览发布包内容。
pnpm release:pack
```

## 仓库地址

<https://github.com/zzjtnb/zzjtnb-lint-config>

## 许可证

[MIT](./LICENSE) © 2022-PRESENT [争逐](https://zzjtnb.com)
