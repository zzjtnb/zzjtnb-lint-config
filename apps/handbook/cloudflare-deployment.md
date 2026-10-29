# Cloudflare 部署指南

本文档说明如何在 Cloudflare 上通过连接 GitHub 仓库的方式，分别部署本项目的文档站（Docs）与独立实验工作台（Playground）。

Cloudflare 当前控制台提供两种 Git 自动部署路径：

1. **Cloudflare Pages（推荐首选）**：纯静态托管，零配置部署命令，配置最直观。
2. **Cloudflare Workers (带构建与静态资产模式)**：控制台默认新建 Worker 流程，需指定 `--assets` 参数。

---

## 架构与能力边界

本项目为 pnpm Monorepo 仓库，包含两个可独立构建部署的 Web 应用：

| 项目 | 技术栈 | 构建产物目录 | 部署类型 |
| --- | --- | --- | --- |
| **Docs** | VitePress 2 (SSG) | `docs/.vitepress/dist` | 静态文档站点 |
| **Playground** | Vite 8 + Vue 3 | `playground/dist` | 静态客户端工作台 |

> **能力说明**：Playground 是纯静态配置实验台。构建时生成规则元数据和检查服务文件，部署后由浏览器 WebContainer 安装依赖、解析配置、检查和修复示例源码，不依赖本地运行器或检查后端。必须保留产物中的 `_headers`，通过 HTTPS 与 COOP/COEP 实现跨源隔离；兼容性和验证边界见 Playground README。

---

## 方案 A：通过 Cloudflare Pages 部署（推荐）

在控制台中进入 **Workers & Pages** -> **Create** -> 选择 **Pages** 选项卡 -> **Connect to Git** 并关联本仓库。

### 1. 部署 Docs 文档站

- **项目名称 (Project name)**：`lint-docs`
- **生成默认域名**：`https://lint-docs.pages.dev/`
- **建议自定义域名**：`https://lint.docs.zzjtnb.com/`
- **生产分支 (Production branch)**：`main`
- **框架预设 (Framework preset)**：选择 `None`（**千万不要选 VitePress 预设**，预设默认填入的 `npx vitepress build` 不适用于 pnpm Monorepo 且会缺少根目录上下文）
- **根目录 (Root directory)**：留空或填 `/`（保持仓库根目录，由根目录统一调度 pnpm 工作区）
- **构建命令 (Build command)**：

  ```bash
  # 构建文档站的生产产物。
  pnpm --filter @zzjtnb/docs run build
  ```

- **构建输出目录 (Build output directory)**：

  ```text
  docs/.vitepress/dist
  ```

- **环境变量 (Environment variables)**：
  - `NODE_VERSION`：`22`
  - `PNPM_VERSION`：`10`（或 `12.15.0`）
  - `PLAYGROUND_URL`：（可选）文档站顶栏跳转线上 Playground 的外链地址。若未单独部署 Playground，可留空；若已部署 Playground，填入工作台地址（未绑定域名时填 `https://lint-play.pages.dev/`，绑定自定义域名后填 `https://lint.play.zzjtnb.com/`）

### 2. 部署 Playground 工作台

再次在 Pages 中点击 **Connect to Git** 关联该仓库：

- **项目名称 (Project name)**：`lint-play`
- **生成默认域名**：`https://lint-play.pages.dev/`
- **建议自定义域名**：`https://lint.play.zzjtnb.com/`
- **生产分支 (Production branch)**：`main`
- **框架预设 (Framework preset)**：选择 `None`（避免默认预设直接在根目录执行 `vite build`）
- **根目录 (Root directory)**：留空或填 `/`
- **构建命令 (Build command)**：

  ```bash
  # 构建工作台的生产产物。
  pnpm --filter @zzjtnb/playground run build
  ```

- **构建输出目录 (Build output directory)**：

  ```text
  playground/dist
  ```

- **环境变量 (Environment variables)**：
  - `NODE_VERSION`：`22`
  - `PNPM_VERSION`：`10`（或 `12.15.0`）

---

## 方案 B：通过 Cloudflare Workers 部署（Workers Static Assets 模式）

如果在控制台直接点击 **Create Worker** 并连接了 GitHub 仓库，界面为 Worker 构建配置：

### 1. 部署 Docs 文档站

- **项目名称**：`lint-docs`
- **生成默认域名**：`https://lint-docs.<your-account>.workers.dev/`（Workers 分配的是 workers.dev 二级域名）
- **建议自定义域名**：`https://lint.docs.zzjtnb.com/`
- **构建命令**：

  ```bash
  # 构建文档站的生产产物。
  pnpm --filter @zzjtnb/docs run build
  ```

- **部署命令**（核心参数）：

  ```bash
  # 上传文档站的静态生产资源。
  npx wrangler deploy --assets=docs/.vitepress/dist
  ```

- **预览命令**：

  ```bash
  # 预览文档站的静态生产资源。
  npx wrangler preview --assets=docs/.vitepress/dist
  ```

- **高级设置 -> 环境变量**：
  - `NODE_VERSION`：`22`
  - `PNPM_VERSION`：`10`（或 `12.15.0`）
  - `PLAYGROUND_URL`：（可选）文档站顶栏跳转线上 Playground 的外链地址。若未单独部署 Playground，可留空；若已部署 Playground，填入工作台地址（未绑定域名时填 `https://lint-play.pages.dev/` 或对应的 workers.dev 地址，绑定自定义域名后填 `https://lint.play.zzjtnb.com/`）

### 2. 部署 Playground 工作台

- **项目名称**：`lint-play`
- **生成默认域名**：`https://lint-play.<your-account>.workers.dev/`
- **建议自定义域名**：`https://lint.play.zzjtnb.com/`
- **构建命令**：

  ```bash
  # 构建工作台的生产产物。
  pnpm --filter @zzjtnb/playground run build
  ```

- **部署命令**：

  ```bash
  # 上传工作台的静态生产资源。
  npx wrangler deploy --assets=playground/dist
  ```

- **预览命令**：

  ```bash
  # 预览工作台的静态生产资源。
  npx wrangler preview --assets=playground/dist
  ```

- **高级设置 -> 环境变量**：
  - `NODE_VERSION`：`22`
  - `PNPM_VERSION`：`10`（或 `12.15.0`）

---

## 自定义域名与两站联动

1. **绑定域名**：
   - Docs 站点绑定主域名（如 `lint.docs.zzjtnb.com`）；
   - Playground 站点绑定二级域名（如 `lint.play.zzjtnb.com`）。
2. **顶栏外链联动**：
   - 在 Docs 的环境变量中添加 `PLAYGROUND_URL = https://lint.play.zzjtnb.com/`；
   - 后续 GitHub 每次 push 代码触发自动构建时，文档站顶栏的 `Playground` 导航会自动链接到该线上工作台。

---

## 常见构建问题排查

### `ERR_PNPM_IGNORED_BUILDS` 报错

- **根因**：pnpm 12 默认开启了严格的依赖构建安全策略（Supply-Chain Security）。当项目依赖中含有原生二进制构建脚本（如 `@parcel/watcher`、`esbuild`）而未在工作区配置中显式批准时，在 CI / Cloudflare 无交互终端环境下 `pnpm install` 会直接报错 `ERR_PNPM_IGNORED_BUILDS`。
- **解决方案**：在 `pnpm-workspace.yaml` 中配置 `allowBuilds` 显式设为 `true`：

  ```yaml
  # 仅允许列出的依赖执行安装构建脚本，不放开全部第三方生命周期。
  allowBuilds:
    # 允许文件监听器安装平台适配产物。
    '@parcel/watcher': true
    # 允许安装脚本准备对应平台的 esbuild 可执行文件。
    esbuild: true
  ```

### `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION` 报错

- **根因**：pnpm 默认启用了供应链安全策略 `minimumReleaseAge: 1440`（等待 1 天后才允许安装新发布的依赖版本）。Cloudflare 构建容器在执行 `pnpm install --frozen-lockfile` 时，若 lockfile 中有 24 小时内刚在 npm 发布的次要子依赖（如 `@babel/parser`、`electron-to-chromium` 等），会因为未达冷却时间而中断构建。
- **解决方案**：本项目已在 `pnpm-workspace.yaml` 中全局配置 `minimumReleaseAge: 0`，以取消 CI/云端构建中的延迟等待，确保与 lockfile 严格对齐顺利安装。无需在 Cloudflare 控制台添加额外临时参数。
