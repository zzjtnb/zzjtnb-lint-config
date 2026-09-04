# Playground

Lint Lab 将 ESLint、Stylelint 和 Markdownlint 三个共享配置包放在同一工作台，提供代码实验、配置接入和规则参考。启动、功能与使用限制见 [Playground README][readme]。

代码实验通过 Vite 开发服务的同源 Node.js 接口调用真实引擎，使用当前共享配置源码；配置草稿不会在服务端执行。静态页面与 `vite preview` 不提供运行器。

## ESLint Config Inspector

Inspector 加载 `playground/eslint.config.ts`，通过 workspace 包入口读取 ESLint 配置，与代码实验直接读取源码的入口不同。首次使用且缺少配置包产物，或修改配置包源码后，先在仓库根目录构建对应包：

```bash
pnpm --filter @zzjtnb/eslint-config run build
```

确认产物与当前源码一致后，启动 Inspector 查看完整配置项、规则来源和文件匹配：

```bash
pnpm --filter @zzjtnb/playground run dev:inspector
```

打开终端给出的地址。`dev:inspector` 和 `build:inspector` 本身不会先构建配置包，已有产物也不会自动证明规则与最新源码一致。

生成静态 Inspector：

```bash
pnpm --filter @zzjtnb/playground run build:inspector
```

生成物位于 `playground/.eslint-config-inspector`，已被 Git 忽略。它与工作台页面构建是独立产物，可以交给静态服务器托管。

## 页面构建

在仓库根目录执行：

```bash
pnpm --filter @zzjtnb/playground run build
```

该命令只生成 Vite 页面，不构建 Inspector，也不生成可部署的 Node.js 运行器。

## 开发与贡献

工作台的开发验证命令、实现职责和维护约定见 [AGENTS.md][agents]。仓库级测试组织见[工程参考][engineering]；公开包安装与配置见[快速开始][quick-start]。

[agents]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/playground/AGENTS.md
[readme]: https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/playground/README.md
[engineering]: ./engineering#测试
[quick-start]: ./quick-start

## 启动与固定端口

从仓库根安装依赖后，选择工作台包运行：

```bash
pnpm --filter @zzjtnb/playground run dev
```

访问 `http://localhost:3001/`。开发和预览使用同一端口，不同时启动；文档站使用 3000，不与工作台冲突。开发服务监听网卡地址，只应在可信的本机或局域网使用，不能当作带认证与资源隔离的公网代码服务。

## 三个视图分别做什么

| 视图 | 输入 | 实际结果 | 边界 |
| --- | --- | --- | --- |
| 代码实验 | 预设文件类型下的内存文本 | 真实引擎诊断和可修复输出 | 不执行输入程序，不导入任意项目 |
| 配置接入 | 可编辑配置草稿 | 可复制的安装与接入材料 | 草稿不是服务端执行配置 |
| 规则参考 | 工具、文件类型与筛选条件 | 引擎解析出的规则和选项 | 不是所有插件的静态规则百科 |

规则元数据按工具和虚拟文件读取。ESLint 为隔离本仓库工作区策略，在实验运行器中设置 `pnpm: false`；不能用这个实验结果证明消费项目的 pnpm workspace 规则正确。

## 输入与请求边界

- 仅允许预设工具与文件名，不接受上传项目、路径穿越或任意文件读取。
- 代码限制为 65,536 个 UTF-8 字节；HTTP 请求体上限为 70,000 字节。
- 规则查询使用 GET，代码检查使用 POST 和 `application/json`。
- Origin 按协议、主机、端口完整比较；无认证的本地接口不能因此被描述为公网安全沙箱。
- 请求分块先按字节收集再解码，避免中文 UTF-8 被截断。
- 引擎错误、无效输入与正常诊断分别反馈，不用空诊断伪装运行成功。

## 异步操作、修复与分享

切换工具或文件、编辑正在检查的内容时，旧结果不应覆盖新草稿。自动修复后返回最终文本及对应诊断，不能用修复前的行列定位修复后的内容。

分享保存整个工作区快照，包括工具、视图、配置草稿、预设文件草稿和选择状态。URL 编码不是加密；不要放入敏感信息。编辑后的本地存储和分享链接分别代表当前状态与固定快照，不把旧 hash 当成最新内容。

## Vite 插件的职责

`plugins/api.ts` 把同源 HTTP 接口挂到 Vite 开发服务，负责协议边界；`plugins/engine.ts` 调用真实 lint 引擎并维护元数据缓存。这是开发期 Node.js 能力，不是独立后端服务，也不是构建时执行用户代码。

浏览器不能直接运行这些依赖 Node.js API 的引擎。要变成纯静态在线 Playground，需要单独验证浏览器可用引擎或隔离运行服务，不是把 `plugins/` 改名或把文件搬进 `src/` 就能实现。

## 预览不能代替运行器

```bash
pnpm --filter @zzjtnb/playground run build
pnpm --filter @zzjtnb/playground run preview
```

上述流程供已允许构建和服务启动时使用。预览在 3001 提供静态页面，但没有代码检查接口；运行器未连接时页面应明确告知，而不是报告“没有错误”。修改共享配置后，重启开发服务使规则缓存与当前源码一致，再验证真实请求。
