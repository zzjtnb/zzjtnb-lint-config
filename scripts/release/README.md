# 发布脚本维护说明

`index.js` 提供根 `package.json` 的交互入口 `pnpm release`，不是对原生命令发布方式的替代或禁用。面向维护者的正文按用途分别维护：

- [当前发布流程](../../apps/handbook/当前发布流程.md)：现行交互脚本的条件、菜单、版本处理、检查、发布和核验步骤。
- [原始发布流程](../../apps/handbook/原始发布流程.md)：不依赖该脚本的 pnpm 原生命令，包括稳定版、预发布和隔离消费验证。
- [发布常见问题](../../apps/handbook/发布常见问题.md)：集中维护 npm 官方发布机制及通用错误；脚本自身的问题和恢复归当前发布流程，原生命令使用问题归原始发布流程。

本文件只记录脚本实现与测试约定，不另维护一份完整操作流程或排障正文。

## 模块划分

| 模块 | 职责 |
| --- | --- |
| `index.js` | 入口：参数与交互条件判断，串联完整流程；只有直接执行时才启动 |
| `packages.js` | 公开包范围、包目录与版本读取、按产物生成检查步骤、发布范围菜单 |
| `version.js` | 稳定版本解析、比较、递增、可用性判断与统一版本候选；纯函数 |
| `registry.js` | npm 官方源常量、包状态查询、登录检查、所选包状态读取 |
| `plan.js` | 版本计划的选择、确认与写入 |
| `publish.js` | 发布前检查、打包预览、逐包发布与发布后提示 |
| `command.js` | 子进程执行与“必须成功、可重试或中止”的步骤 |
| `prompt.js` | 共享 readline、菜单、重试菜单，以及子进程接管终端 |

`index.js` 编排各业务模块；`plan.js`、`publish.js` 和 `registry.js` 按需调用命令与交互能力。`command.js` 从 `packages.js` 获取仓库根目录，`packages.js` 通过 `prompt.js` 展示发布范围菜单；`version.js` 保持纯计算。模块之间不形成循环依赖，也不反向导入入口。测试直接导入所属模块，入口不为测试转发导出。

## 实现契约

- 发布范围由 `packages.js` 的 `PACKAGE_DIRECTORIES` 维护，只包含三个公开配置包，根目录和其他私有 workspace 不发布。
- 入口先判断 `--help` 与交互条件；帮助不启动登录、版本写入或发布，非 TTY 或设置了 `CI` 时拒绝正式流程。
- 稳定版本解析集中于 `version.js` 的 `parseVersion`；脚本不支持预发布与自选 dist-tag，不能因此删掉原生命令文档中的有效能力。
- `packages.js` 的 `packageCheckSteps` 按包的实际产物生成检查；Markdownlint 同样构建与检查 TypeScript 扫描入口。
- 构建、类型检查与单次测试按已选包执行，随后统一调用一次根目录 lint 检查整个仓库；失败只重试当前检查或中止，不跳过失败项，也不自动修复源码。
- 发布范围菜单首项（默认）为全部三个包，其余为单包；不保留只发部分组合的旧选项。
- 版本先由 `plan.js` 的 `chooseVersionPlan` 生成计划且不写文件：默认所选包统一同号，可选统一 patch / minor / major、自定义统一版本或逐包设置。候选基础取所选包本地与 npm `latest` 中的最高版本；已有可用的最高本地版本时优先沿用，供中途失败后恢复。
- `version.js` 的 `versionProblem` 是版本可用性的唯一判断：拒绝 `0.0.0`、不高于 latest、已发布及曾取消发布的版本；计划确认前任一包不满足即返回选择。
- `applyVersionPlan` 只改写与计划不同的包；任一写入失败立即停止，不回滚、不整批递增，依赖同步失败只重试 install。写入后重新读取并与计划核对。
- `publish.js` 的 `publishPackage` 经 `handOverTerminal` 在包目录直接调用 pnpm 并保留终端，不通过捕获输出或多层转发破坏 OTP 交互。
- 发布尝试前重新核对 registry 的 latest、已发布与已取消发布版本；命令非零不等于 registry 未接收，不盲目重写。
- 最终只打印远程核验入口，不把“输出查询命令”表述为“已完成远程核验”。
- 导入模块不启动交互或发布；Git commit、tag、push 与 GitHub Release 不属于脚本自动行为。

## 回归验证

在仓库根目录执行已安装工具，不触发真实登录、版本变更、安装或发布：

```bash
# 使用 Node.js 原生测试运行器执行脚本测试，完成后退出，不启动发布。
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/scripts run test
# 检查并自动修复指定 JavaScript、TypeScript 或 Vue 文件。
pnpm --config.verifyDepsBeforeRun=error exec eslint scripts/release --fix
# 检查并自动修复指定 Markdown 文件，使用命令中的配置或 CLI2 自动发现配置。
pnpm --config.verifyDepsBeforeRun=error exec markdownlint-cli2 --config .markdownlint-cli2.mjs --fix scripts/release/README.md "apps/handbook/*.md"
```

恢复用例以子进程、readline 和 registry 替身验证调用顺序与停止条件，不能据此宣称真实账号、远程发布或 OTP 已验证。文档 Shell 检查只解析语法，不执行其中的安装或对外写命令。
