# 脚本维护约定

## 安装前检查

`preinstall.js` 是不依赖已安装包的安装钩子。要求从根 `package.json` 的 `packageManager` 与 `engines` 读取，按脚本地址定位，不依赖调用目录。

检查包管理器身份标识，区分非预期工具、身份缺失和基本格式异常。成功保持静默；失败写入 stderr、返回非零状态，并说明检测结果、项目要求及恢复命令。不要输出完整 user-agent，也不要自动安装、联网、升级环境或修改文件。

`packageManager` 的版本声明不等同于精确版本限制。不要在脚本中复制 semver 解析或增加未声明的严格版本策略；版本兼容性由包管理器按 `engines` 检查。帮助入口 `--help` / `-h` 不要求安装身份，未知参数应失败而不是静默忽略。

安装帮助与失败报告共用完整恢复指引，不因运行平台而隐藏其他平台选项。以 [pnpm 当前安装页](https://pnpm.io/installation) 的各平台选择器为准：macOS / Linux 先列推荐的独立脚本 curl / wget，再列 npm 引导器；Windows 先列推荐的 npm 引导器，再列 PowerShell 独立脚本及 Defender 拦截说明；Docker 先列推荐的 bash / sh / dash 脚本，再列镜像已有 Node.js 与 npm 时的备选。官方仅标为备选的方法不能擅自称为“不推荐”。npm 引导器需要 Node.js 22.13+；独立 pnpm 无需 Node.js，不等于本项目无需 Node.js 26。保留官方预编译二进制入口及架构、glibc / musl 匹配前提，不凭旧印象补入当前页面未列的推荐方式。

容器说明保留 ENV、SHELL 参数，并说明 Dockerfile 的 PNPM_HOME、PATH 和安装用户权限，不假定镜像已有 bash；所有命令只展示，不实际执行。`self-update` 说明安装选择器要求已有 pnpm v11.10.0+，并提醒在项目目录外运行，避免同时改写版本声明。旧版本或损坏安装使用对应平台安装器恢复，不盲目运行不适用的升级命令。终端分区和颜色使用 Node.js 原生 `styleText`，按实际 stdout / stderr 判断颜色能力，尊重 `NO_COLOR`、`FORCE_COLOR` 及管道输出。

安装钩子是防误用检查，不是安全边界；包管理器可以通过跳过脚本的选项不执行它。

## 检查与格式化入口

根脚本先置顶 `bootstrap`、`preinstall`、`postinstall`，再按开发及别名、构建及预览、类型检查、清理发布、linter、format、workspace 批量检查、测试归组。检查与格式化各自按单项在前、汇总在后连续排列；其他包按其实际职责沿用分组，不补无用工具入口。

检查入口维护工具参数且不自动修复。格式化通过 `pnpm run lint:<工具> --fix` 复用检查入口，不复制 glob、配置地址和缓存参数。前置操作由被调用的检查脚本负责，避免在 `preformat:*` 再执行同一构建。

固定 JSON 元数据使用 Node.js 原生 JSON 模块导入，保留 `with { type: 'json' }` 属性；需要读取运行期间变化的文件时仍按实际读取职责处理，不把可变数据错误地缓存成模块。

文档和手动执行命令使用 `pnpm exec <工具>`，package scripts 直接使用工具命令名，不硬编码第三方包内部入口。需要隔离包管理器生命周期的 CLI 子进程测试，通过 `tests/helpers/cli.ts` 读取工具包正式声明的 `bin`，不猜测 `node_modules` 布局或 CLI 文件名。

pnpm 当前的 `verifyDepsBeforeRun` 默认是 `install`，会在 run / exec 前自动安装不同步的依赖，进而触发安装生命周期。依据 [官方设置说明](https://pnpm.io/settings/build#verifydepsbeforerun)，仅检查且未授权安装时临时使用 `pnpm --config.verifyDepsBeforeRun=error exec <工具> ...`，让状态不一致明确失败；报告依赖缺口，不自动改全局或项目设置，也不改成直接运行第三方内部文件。

## 发布文档归属

发布操作正文按实际用途保留：`apps/handbook/当前发布流程.md` 写现行交互脚本的完整流程及脚本自身的问题和恢复；`原始发布流程.md` 写不依赖该脚本的纯命令操作及其使用问题，是可用的另一种方式，不因名称中的“原始”就标为废弃历史；`发布常见问题.md` 集中维护 npm 官方发布机制与通用错误，其他文档只引用，不散落重复排障。`scripts/release/README.md` 面向脚本维护，只保留实现与测试约定并导航正文。

去重不能删减有效能力，也不能用几行索引替代上述操作正文。脚本实现改变时同步更新所属流程和问题章节；修正失效命令、旧环境或错误前提时保留对应任务与排障覆盖，不将不支持交互脚本的预发布能力一并删除。

## 清理入口

`clean.js` 只回收声明的生成目录，默认保留锁文件；显式 `--del-lock` 才回收 `pnpm-lock.yaml`。帮助与非法参数必须在扫描工作区前结束，导入模块不能启动清理；单元测试只模拟文件系统，不执行真实清理。清理依赖系统 `trash`，失败时保留非零状态并提示从回收站恢复，不回退到永久删除。

## 验证

在仓库根目录执行，不运行真实安装或发布：

```bash
pnpm exec vitest run scripts/tests --project unit
pnpm exec eslint scripts/preinstall.js scripts/tests --fix --max-warnings 0
```

安装检查的子进程测试覆盖管理器识别、缺失与异常身份、帮助、未知参数及不同调用目录。工作区版本范围与长驻任务契约也由该组测试核对；发布脚本的测试仍归其所属目录。
