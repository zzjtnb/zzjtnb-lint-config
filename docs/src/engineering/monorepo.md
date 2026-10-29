---
navigation:
  # 工程与维护侧栏中的页面名称。
  text: Monorepo
  # 与依赖版本管理、包联调指南归入同一主题。
  group: engineering
  # 保留现有页面顺序，新增工程搭建指南。
  order: 30
---

# 使用 Turborepo 与 pnpm 管理 Monorepo

pnpm 负责工作区、依赖安装和锁文件，Turborepo 根据工作区依赖关系编排任务，并缓存可复用的结果。两者配合，让多个包和应用共用一套工程入口，同时保留各自的构建、检查和运行方式。

本文以本项目为例：`packages/` 中的 ESLint、Stylelint、Markdownlint 是三个公开配置包，Docs、Playground、消费示例及维护工具是辅助项目。搭建自己的 Monorepo 时，按实际项目职责调整目录与脚本，不必复制所有辅助设施。

## 先分清配置归属 {#responsibilities}

| 配置位置 | 管理内容 |
| --- | --- |
| 根 `pnpm-workspace.yaml` | 哪些目录属于工作区、catalog 和 pnpm 安装策略 |
| 各工作区 `package.json` | 包名、实际依赖、该项目自己的工具脚本 |
| 根 `package.json` | pnpm 版本、统一开发与检查入口、根目录真实使用的工具 |
| 根 `turbo.jsonc` | 任务依赖、输入、输出、环境变量和缓存策略 |
| 根 `pnpm-lock.yaml` | 全工作区实际解析的依赖与完整性信息 |
| 应用自己的 `.env` | 该应用的开发、预览及构建环境配置 |

Turborepo 不代替 pnpm 安装依赖，也不会自动为每个包生成 build 脚本。pnpm 的 `workspace:` 表达“依赖哪个包”，Turbo 的 `dependsOn` 表达“执行任务前先完成什么”。

## 从新项目或已有仓库开始 {#start}

### 新项目使用官方脚手架

```bash
# 在计划创建项目的父目录执行，使用官方 create-turbo 并选择 pnpm。
pnpm dlx create-turbo@latest my-monorepo --package-manager pnpm
# 进入脚手架生成的新工作区。
cd my-monorepo
# 查看实际生成的应用、包和脚本，再按项目需要调整。
pnpm list -r --depth -1
```

脚手架提供起点，不要求业务项目永久使用生成的框架或目录。保留需要的默认配置，再按真实职责替换示例；不要把另一个应用的 tsconfig、构建入口和运行器机械复制过来。

### 已有 pnpm 工作区接入 Turbo

先确认根目录已经有有效的 `package.json`、`pnpm-workspace.yaml` 和各项目清单，再添加根任务调度工具：

```bash
# 从工作区根目录添加 Turbo；各应用只声明自己的 Vite、VitePress、tsdown 等工具。
pnpm add -Dw turbo
# 同步已有工作区清单与锁文件；如果安装已完成且清单未变，无需重复执行。
pnpm install
```

本项目用 catalog 维护 Turbo 版本，根清单通过 `catalog:` 引用。Catalog 的配置与升级范围统一见[依赖版本管理](/dependencies)，不在每个工作区复制版本号。

## 按项目职责划分目录 {#structure}

```text
zzjtnb-lint-config/
├── packages/
│   ├── eslint/          # 公开 ESLint 配置包
│   ├── stylelint/       # 公开 Stylelint 配置包
│   └── markdownlint/    # 公开 Markdownlint 规则和扫描配置
├── docs/                      # VitePress 文档应用
├── playground/                # Vue / Vite 工作台
├── apps/
│   └── demo/                  # 通过公开入口使用三个包的消费示例
├── internal/
│   └── testing/               # 工作区契约及工具链验证
├── scripts/                   # 清理、安装守卫、端口和发布脚本
├── package.json               # 根脚本及实际工具依赖
├── pnpm-workspace.yaml        # 工作区和 pnpm 配置
├── pnpm-lock.yaml             # 统一锁文件
└── turbo.jsonc                # 根任务图
```

`apps/*` 和 `packages/*` 是常用组织方式，不是 pnpm 或 Turbo 强制的目录名。Docs、Playground 可以保持自身脚手架目录，只要工作区清单能发现它们。

公开包的运行入口只依赖自身实现、正式外部依赖和声明的 peer。它们不能反向依赖 Docs、Playground、scripts 或 internal/testing。消费应用依赖公开包，辅助工程测试通过公开入口验证它们。

## 声明工作区和依赖 {#workspace}

### 工作区发现

```yaml [pnpm-workspace.yaml]
# 匹配真正包含 package.json 的项目目录，不把临时目录和备份纳入工作区。
packages:
  - packages/*
  - apps/*
  - docs
  - playground
  - internal/testing
  - scripts
```

目录被匹配后，pnpm 才会把它作为工作区项目处理。包名来自各自的 `package.json.name`，不是目录名；`--filter @zzjtnb/lint-demo` 选择的是实际包名。

### 用 workspace 表达本地依赖

```json [apps/demo/package.json（依赖片段）]
{
  "name": "@zzjtnb/lint-demo",
  "private": true,
  "devDependencies": {
    "@zzjtnb/eslint-config": "workspace:*",
    "@zzjtnb/stylelint-config": "workspace:*",
    "@zzjtnb/markdownlint-config": "workspace:*"
  }
}
```

`name` 用于筛选和任务标识；`private: true` 阻止消费示例误发布；这里的配置包用于开发检查，放在 `devDependencies`。如果某个库在业务运行时使用，则放进该业务包的 `dependencies`。

`workspace:*` 要求本地工作区存在对应包，避免意外安装注册表同名包。打包时 pnpm 会转换工作区依赖范围；完整的协议变体和发布验证见[包联调指南](/debugging#monorepo)。

ESLint、Stylelint、CLI2 等执行工具仍由实际运行它们的项目声明。根目录只安装根脚本使用的工具，不依赖偶然提升来让子项目找到依赖。

## 根入口与项目脚本 {#scripts}

### 根入口集中维护工作流

下面是本项目常用入口的精简示例，合并到已有清单，不覆盖其他脚本：

```json [package.json（根入口片段）]
{
  "name": "zzjtnb-lint-config",
  "private": true,
  "packageManager": "pnpm@12.15.0",
  "scripts": {
    "dev": "turbo run dev --continue=dependencies-successful",
    "build": "turbo run build",
    "preview": "turbo run preview",
    "typecheck": "turbo run typecheck"
  }
}
```

`private` 防止根项目发布；`packageManager` 固定这个示例使用的 pnpm 版本，团队升级时同步锁文件与 CI。四个脚本分别调度开发、构建、预览和类型检查；不会自动创建工作区的同名脚本。

Turbo CLI 集中放根目录。ESLint、Stylelint、Markdownlint 的检查和格式化也统一由根入口维护，三个公开配置包不设置 `lint`、`lint:*` 或 `format` 脚本。各项目只保留实际拥有的构建、开发、类型检查和测试等工具命令，例如：

| 工作区 | build | dev | typecheck |
| --- | --- | --- | --- |
| 三个配置包 | `tsdown` | `tsdown --watch` | `tsc --noEmit` |
| Docs | `vitepress build` | `vitepress dev` | `vue-tsc --noEmit -p tsconfig.json` |
| Playground | 资料生成后执行 Vite 构建 | 资料生成后启动 Vite | `vue-tsc --build` |
| 消费示例 | 没有构建职责时不添加 | 没有服务时不添加 | 沿用自身编译器命令 |

不为“每个项目脚本看起来一样”增加空 build 或 dev。一个工作区还可能只提供 test、lint 或维护脚本，Turbo 任务图中也可能出现用于连接依赖的中转节点；看到节点不代表该项目执行了一个构建命令。

根目录实际执行的 lint 等操作如何登记和调用，统一见[根任务](#root-tasks)。

## 配置任务依赖和输出 {#tasks}

### 基础任务图

```jsonc [turbo.jsonc]
{
  // 使用官方 Schema 获得字段校验；JSONC 支持注释。
  "$schema": "https://turborepo.dev/schema.json",
  // NODE_ENV 影响编译行为，值变化时使相关任务缓存失效。
  "globalEnv": ["NODE_ENV"],
  // 声明可通过 turbo run 调度的任务及其执行关系。
  "tasks": {
    "build": {
      // 先构建当前包依赖的工作区包，不是按目录字母顺序构建。
      "dependsOn": ["^build"],
      // 保留默认输入，并跟踪可能被 Git 忽略的本项目环境文件。
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      // 路径相对于执行任务的工作区，缓存命中时恢复这些产物。
      "outputs": ["dist/**"],
    },
    "dev": {
      // 开发服务启动前先准备依赖包的构建入口。
      "dependsOn": ["^build"],
      // 开发服务必须实际启动，不重放一次旧的成功结果。
      "cache": false,
      // 表示持续运行的服务或监听进程。
      "persistent": true,
    },
    "preview": {
      // 预览需要当前应用自己的 build，不只是依赖包的 build。
      "dependsOn": ["build"],
      // 每次实际启动预览服务。
      "cache": false,
      // 预览服务长期运行。
      "persistent": true,
    },
    "typecheck": {
      // 此例先准备发布声明，适用于消费工作区读取依赖包 dist 的情况。
      "dependsOn": ["^build"],
      // 只缓存类型检查结果，不声明需要恢复的输出文件。
      "outputs": [],
    },
  },
}
```

这是一份基础配置示例。后文标注“合并到 tasks”的代码片段都属于同一个 tasks 对象，应按任务名合并；不能在同一 JSONC 中重复粘贴多个 tasks 键，让后一个覆盖前一个。本项目的类型检查由安装阶段先准备公开包入口；是否给 typecheck 增加前置构建，取决于项目是否需要读取尚未生成的依赖声明。

### dependsOn 如何表达执行顺序

| dependsOn 的值 | 等待哪个任务 | 用途 |
| --- | --- | --- |
| `["^build"]` | 依赖工作区的 build | 应用读取依赖包的 dist 前先构建它们 |
| `["build"]` | 当前工作区的 build | 预览当前应用自己的构建结果 |
| `["@zzjtnb/eslint-config#build"]` | 指定工作区的具体任务 | 只有确有固定任务依赖时才显式指定 |

前置任务不只是决定执行先后，其哈希也会影响相关任务的缓存键。没有依赖关系的有限任务可以并行；同一条命令中的 build、typecheck 不会因为文字先后自动串行。

任务图来自 package.json 声明的工作区依赖。只在代码中导入某包而不声明依赖，Turbo 无法可靠确定构建顺序。

本项目可以看到以下实际关系：

| 任务 | 前置构建 | 原因 |
| --- | --- | --- |
| ESLint 包 build | 没有其他工作区 build | 依赖的是其声明的外部实现包 |
| Stylelint 包 build | ESLint 包 build | 开发检查依赖 ESLint 工作区配置 |
| Markdownlint 包 build | 没有其他工作区 build | 扫描入口和规则由本包提供 |
| Playground build | 三个配置包 build | 生成资料和运行资源使用三个公开入口 |
| Docs build | 不因展示示例就依赖三个包 build | Markdown 代码示例不是运行时包依赖 |

构建图也会读取开发依赖。Stylelint 的开发检查依赖 ESLint，不代表 Stylelint 发布后要求业务项目同时安装 ESLint；发布消费关系仍以 dependencies 和 peerDependencies 为准。

### 按工作区覆盖任务配置

本例通用 build 声明缓存 `dist/**`；Turbo 自身不会猜测所有工具的输出目录。VitePress 生成 `.vitepress/dist/**`，需要明确登记。在根任务图中用“包名#任务名”表达差异，无需给每个应用再复制一份 turbo.json：

```jsonc [turbo.jsonc（合并到 tasks）]
{
  "tasks": {
    "@zzjtnb/docs#build": {
      // 保留上游依赖的构建顺序。
      "dependsOn": ["^build"],
      // 保留源码默认输入，同时跟踪文档项目的环境文件。
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      // 实际影响导航链接的环境变量同时参与哈希。
      "env": ["PLAYGROUND_URL"],
      // VitePress 的产物目录相对于 docs 工作区。
      "outputs": [".vitepress/dist/**"],
    },
  },
}
```

缓存命中时，outputs 声明的文件才会被恢复。漏写输出可能出现“显示缓存命中，但部署目录没有文件”；把源码或整个 node_modules 写进 outputs，也不是正确的产物声明。

### 跨项目读取文件时补充输入

Playground 使用 Docs 的主题变量源文件；这种文件引用不等同于一个依赖包构建，可以将该文件加入该任务输入：

```jsonc [turbo.jsonc（合并到 tasks）]
{
  "tasks": {
    "@zzjtnb/playground#build": {
      // 先准备 Playground 声明的配置包依赖。
      "dependsOn": ["^build"],
      // 明确跟踪跨目录源文件，保留工作区默认源码和环境输入。
      "inputs": [
        "$TURBO_DEFAULT$",
        ".env*",
        "$TURBO_ROOT$/docs/.vitepress/theme/styles/variables.scss",
      ],
      // 工作台的最终发布产物。
      "outputs": ["dist/**"],
    },
  },
}
```

`$TURBO_DEFAULT$` 保留 Turbo 的默认输入集合，`$TURBO_ROOT$` 指向仓库根目录。自定义 inputs 时若丢掉默认集合，源码变化可能不再按预期使缓存失效。

## 根任务的注册、调用与执行范围 {#root-tasks}

### 什么时候需要根任务

根目录通常有两种脚本，先确定职责再配置：

| 脚本类型 | 例子 | Turbo 中如何处理 |
| --- | --- | --- |
| 汇总入口 | 根 build 调用 turbo run build | 调度工作区任务，不再注册为同一个根 build 任务 |
| 根目录的实际工作 | 根 lint:eslint 执行 eslint . | 注册根任务，再由汇总入口调用 |

本项目统一用根 ESLint、Stylelint、Markdownlint 配置扫描仓库，因此三个 lint 工具真正从仓库根目录运行。它们应注册为根任务，不应无意间调度所有工作区里的同名脚本。

### 第一步：在根 package.json 声明实际命令

```json [package.json（根检查脚本片段）]
{
  "scripts": {
    "lint:eslint": "eslint . --cache --cache-location node_modules/.cache/.eslintcache --config eslint.config.js",
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html}\" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache",
    "lint:markdownlint": "markdownlint-cli2 --config .markdownlint-cli2.mjs \"**/*.md\"",
    "lint": "turbo run //#lint:eslint //#lint:stylelint //#lint:markdownlint"
  }
}
```

| 根脚本 | 实际职责 |
| --- | --- |
| lint:eslint | 读取根 ESLint 配置并使用文件缓存；error 导致失败，warning 不单独阻断 |
| lint:stylelint | 按样式 glob 检查、读取根配置并使用 Stylelint 文件缓存 |
| lint:markdownlint | 按 Markdown glob 检查，使用根 CLI2 配置 |
| lint | 仅调度下面注册的三个根任务，不再嵌套调用自身 |

### 第二步：在根 turbo.jsonc 注册根任务

```jsonc [turbo.jsonc（合并到 tasks）]
{
  "tasks": {
    // 根 ESLint 脚本，先准备根清单依赖的公开配置包入口。
    "//#lint:eslint": {
      "dependsOn": ["^build"],
      // 每次启动工具命令，不复用 Turbo 任务结果。
      "cache": false,
    },
    // 根 Stylelint 脚本，使用同一组公开包构建前置条件。
    "//#lint:stylelint": {
      "dependsOn": ["^build"],
      "cache": false,
    },
    // 根 CLI2 脚本，需要已构建的共享扫描入口。
    "//#lint:markdownlint": {
      "dependsOn": ["^build"],
      "cache": false,
    },
  },
}
```

| 项目 | 含义 |
| --- | --- |
| `//#lint:eslint` | 官方根任务标记，目标是根 package.json 的 lint:eslint |
| `^build` | 本例先构建根清单声明的工作区依赖，并非按任务名称猜测需要的包 |
| `cache: false` | 不复用此任务的 Turbo 缓存，前置 build 仍可命中缓存 |

其中的 `//#` 是任务名限定符，不是 JSONC 注释；注释的 // 写在字符串外。Stylelint、Markdownlint 采用相同的根任务命名规则。

关闭 Turbo 缓存不等于关闭工具自身缓存：上面的 ESLint 和 Stylelint 仍带 --cache。排查某个文件的规则变化时，可按[包联调指南](/debugging#tool-checks)执行不带缓存的单文件检查。

### 第三步：检查任务图，再执行入口

```bash
# 只预览根 ESLint 及其前置构建，不执行源码检查或构建。
pnpm exec turbo run '//#lint:eslint' --dry=json
# 只执行根 ESLint 及其前置任务。
pnpm exec turbo run '//#lint:eslint'
# 使用根汇总入口执行三个已登记的 lint 任务。
pnpm lint
```

汇总脚本与根任务必须分开。根 build 已经调用 turbo run build 时，再注册一个会执行相同调度命令的根 build，可能形成递归调度；根 lint 也不应登记成调用自身的根 lint 任务。登记的是上面实际执行工具的 lint:eslint 等脚本。

## 筛选工作区并检查任务图 {#filter}

以下命令从仓库根目录执行。`pnpm --filter` 直接选择项目脚本，`turbo --filter` 选择任务图入口并按 dependsOn 追加前置任务。

```bash
# 只运行 ESLint 包自身的构建脚本，不通过 Turbo 调度或缓存。
pnpm --filter @zzjtnb/eslint-config run build
# 通过 Turbo 运行 Stylelint 构建，同时遵守该包的工作区前置依赖。
pnpm exec turbo run build --filter=@zzjtnb/stylelint-config
# 只选择 packages 下的三个公开包作为构建入口。
pnpm exec turbo run build --filter='./packages/*'
# 同时预览多个任务，确认顺序由依赖图决定，而非命令中的文本顺序。
pnpm exec turbo run build typecheck --dry=json
# 查看将执行的命令、依赖、输入输出和缓存信息，不实际执行任务。
pnpm exec turbo run build --dry=json
# 将任务图保留在用途目录中，便于检查真实依赖方向。
mkdir -p .tmp/monorepo/graphs
# 每轮生成新的目录，保留之前的任务图记录。
GRAPH_DIR="$(mktemp -d .tmp/monorepo/graphs/XXXXXX)"
# 生成依赖图文件，不执行构建。
pnpm exec turbo run build --graph="$GRAPH_DIR/build.mermaid"
```

常见依赖筛选方向：

| 筛选 | 选择范围 |
| --- | --- |
| `@zzjtnb/stylelint-config` | Stylelint 包自身 |
| `@zzjtnb/stylelint-config...` | Stylelint 包及它的工作区依赖 |
| `...@zzjtnb/eslint-config` | ESLint 包及依赖它的工作区 |

可以先用 pnpm 列出匹配项目，再决定是否执行任务：

```bash
# 查看 Stylelint 包及其工作区依赖，确认筛选范围。
pnpm --filter '@zzjtnb/stylelint-config...' list --depth -1
# 查看依赖 ESLint 包的工作区，范围可能包含根项目和辅助应用。
pnpm --filter '...@zzjtnb/eslint-config' list --depth -1
# 在已经取得有效 Git 基线的仓库中，预览受 main 分支差异影响的构建任务。
pnpm exec turbo run build --affected --dry=json
```

根 package.json 的依赖也可能进入筛选结果。先用 list 或 --dry=json 检查范围，再运行任务，避免把辅助应用和根项目当成预期之外的调度对象。

脚本命名、分组顺序与可选入口的条件见 [项目脚本](/scripts)。

## 开发服务与环境变量 {#development}

### 开发任务需要持续运行

```bash
# 使用本项目根入口，先按 predev 约定处理开发端口，再启动各工作区开发任务。
pnpm dev
# 只通过 Turbo 启动文档站开发任务，仍遵守任务前置关系。
pnpm exec turbo run dev --filter=@zzjtnb/docs
# 仅监听本地 ESLint 包构建，供其他业务项目联调。
pnpm --filter @zzjtnb/eslint-config run dev
```

根 `pnpm dev` 包含三个配置包的构建监听；它更新 dist，不负责建立外部项目链接。已经建立 link 的消费项目在构建完成后重跑检查即可，无需在每次源码修改后安装。首次建立链接及依赖变化的处理统一见[本地联调指南](/debugging#local-link)。

`persistent: true` 表示任务会常驻，不表示自动监听所有文件。具体变化由 Vite、VitePress、tsdown 的脚本负责处理。不要让其他任务以普通 dependsOn 等待一个不会退出的 dev 服务；它们通常应依赖一次性的 build。

根 dev 使用 `--continue=dependencies-successful`：Docs、Playground 等独立服务中有一个失败时，其他已经成功启动或依赖已成功的任务继续运行；依赖失败构建的服务不会启动。失败仍显示在终端，Turbo 最终退出时保留失败退出码，Ctrl+C 统一停止本次开发任务。单独运行 `turbo run dev` 未指定该参数时，默认会因任一任务失败而取消全部任务。

本项目的根 predev 调用端口脚本，只管理预先配置的清理目标。Docs、Playground 通过各自环境文件设置端口，不从 scripts 导入应用配置；修改端口时也要核对根清理目标。

### 应用配置与 Turbo 环境声明是两件事

```dotenv [docs/.env]
# 文档站自身的开发端口，VitePress preview 默认使用 4173。
VITE_PORT=3000
```

```dotenv [playground/.env]
# 工作台开发和预览使用的端口，Playwright 读取相同应用配置。
VITE_PORT=3001
```

Vite 配置通过 loadEnv 按模式读取环境文件，进程环境变量可以覆盖文件值。Turbo 的环境设置决定这些进程变量是否传递、是否影响缓存；不会替应用解析自己的 `.env`。

| 字段 | 是否传入任务 | 是否参与缓存哈希 | 适用情况 |
| --- | --- | --- | --- |
| `env` | 是 | 是 | 影响当前任务产物的变量 |
| `globalEnv` | 是 | 是，影响所有任务 | 真正影响全局构建结果的变量 |
| `passThroughEnv` | 是 | 否 | 只需传递、不决定缓存产物的变量 |
| `globalPassThroughEnv` | 是 | 否 | 多个任务均需透传的变量 |

例如通过命令行覆盖开发端口时，可以在根任务图的 dev 任务中显式透传：

```jsonc [turbo.jsonc（合并到 tasks.dev）]
{
  "tasks": {
    "dev": {
      // 开发任务不缓存结果。
      "cache": false,
      // 标记为持续服务。
      "persistent": true,
      // 先准备依赖的发布入口。
      "dependsOn": ["^build"],
      // 只向开发任务透传端口，不用它决定生产构建缓存。
      "passThroughEnv": ["VITE_PORT"],
    },
  },
}
```

合并以上透传配置后，可只覆盖一个应用的开发端口：

```bash
# 使用 Bash/Zsh 为本次 Playground 开发任务设置端口，不改写应用环境文件。
VITE_PORT=43101 pnpm exec turbo run dev --filter=@zzjtnb/playground
```

影响构建内容的 PLAYGROUND_URL 应放进 build 的 env，而不是仅透传。同一份 VITE_PORT 不宜同时传给两个本地服务；选择单个应用，或分别修改各自环境文件。

默认严格环境模式下，先检查 env/passThroughEnv 与应用 loadEnv 的读取方式。使用 loose 模式虽然能传入更多变量，但不会自动为遗漏变量补上缓存哈希。

## 缓存的使用与排查 {#cache}

### 先区分三层缓存

| 缓存 | 保存什么 | 相关操作 |
| --- | --- | --- |
| pnpm store | 已下载的包内容 | install 可复用，store prune 清理未引用内容 |
| Turbo 任务缓存 | 任务结果、日志和声明的输出 | turbo run --force 跳过旧结果读取 |
| 工具自身缓存 | ESLint、Stylelint、Vite 等工具的数据 | 按对应工具的参数刷新或禁用 |

构建任务的命令、输入文件、相关清单、依赖图和环境变量共同影响任务哈希。命中 Turbo 缓存后会恢复声明的输出并重放日志，不代表再次执行编译器，也不说明工具自身缓存已清除。

### 核对缓存和强制重跑

```bash
# 正常运行构建，允许命中本地或已配置的远程缓存。
pnpm build
# 对指定应用强制实际执行构建，不读取旧缓存结果；新结果仍可写入缓存。
pnpm exec turbo run build --filter=@zzjtnb/docs --force
# 查看指定任务的输入输出和哈希组成，不执行任务。
pnpm exec turbo run build --filter=@zzjtnb/docs --dry=json
```

先核对 outputs、inputs、环境变量、工作区依赖和任务命令，再决定是否清理缓存。只删除 dist 不会强制重建：如果任务缓存有效，Turbo 可能直接恢复它。

| 现象 | 先核对什么 |
| --- | --- |
| 缓存命中但没有产物 | outputs 是否指向实际输出目录 |
| 源码变化却复用旧结果 | 自定义 inputs 是否保留默认源码，是否存在未声明的跨目录输入 |
| 修改环境变量不生效 | 是否声明 env/globalEnv，是否只使用了不参与哈希的透传变量 |
| 总是缓存未命中 | 是否声明了过大的全局输入、频繁变化文件或无关环境变量 |
| dev 第二次只显示旧日志 | 是否给 dev 设置 cache:false 和 persistent:true |
| 同一包重复构建 | 工作区脚本是否在任务图之外再次调用了依赖包 build |

### 按需启用远程缓存

仅使用 pnpm 工作区和 Turbo 本地缓存不需要登录。团队需要共享任务结果时，可以按所用服务完成关联：

```bash
# 按远程缓存服务流程登录，可能打开浏览器并保存本机认证状态。
pnpm exec turbo login
# 为当前仓库选择并关联远程缓存空间，写入本地关联配置。
pnpm exec turbo link
```

CI 通常通过服务要求的 TURBO_TOKEN、TURBO_TEAM 等环境变量访问，不在非交互环境重复执行本地登录。凭据放在 CI 密钥管理中；根据项目实际需要决定共享哪些产物和日志。

## 本地检查与测试 {#checks}

### 保留测试运行器的职责

Vitest、node:test 和 Playwright 的参数与生命周期不同。本项目根 test 按各自项目入口执行测试，不把所有项目都改成同一个运行器，也不向全部任务统一追加 Vitest 参数：

```bash
# 运行根入口汇总的单元和消费契约测试，CI 使用单次执行模式。
CI=true pnpm test
# 只运行 ESLint 包的 Vitest 测试，完成后退出。
pnpm --filter @zzjtnb/eslint-config run test --run
# 只运行 Playground 单元测试。
pnpm --filter @zzjtnb/playground run test:unit --run
# 通过 Playwright 所属入口执行浏览器测试，需提前准备构建产物和浏览器环境。
pnpm --filter @zzjtnb/playground run test:e2e --project chromium
```

需要把 test 注册进 Turbo 时，先确保任务会单次执行并退出，再声明其前置构建和实际输出；例如有覆盖率文件才把 coverage 目录加入 outputs。常驻测试监听应另设开发任务，不缓存成一次性的 CI 成功结果。

### 格式化、检查与类型验证

根检查入口的登记和调度方式见[根任务](#root-tasks)。日常开发按当前目标选择下面的操作：

```bash
# 在本地使用工具自身的自动修复，可能改写源码。
pnpm format
# 只检查代码、样式和 Markdown，不写回修复。
pnpm lint
# 对已修复的源码执行类型检查。
pnpm typecheck
```

## CI 中如何验证 {#ci}

CI 从固定包管理器版本和锁文件安装，然后验证源码、类型、测试和构建。以本项目已有根入口为例：

```bash
# 在 CI 的已配置 Node/pnpm 环境中按锁文件安装；本项目安装生命周期会准备包入口。
pnpm install --frozen-lockfile
# CI 只检查格式，不自动改写待验证的提交。
pnpm --config.verifyDepsBeforeRun=error run lint
# 检查所属工作区的类型。
pnpm --config.verifyDepsBeforeRun=error run typecheck
# 运行单元和消费契约测试，结束后再开始重建 dist。
CI=true pnpm --config.verifyDepsBeforeRun=error run test
# 最后生成生产产物，避免与读取 dist 的测试同时清空或重建同一目录。
pnpm --config.verifyDepsBeforeRun=error run build
```

缓存分层与使用方式见[缓存](#cache)。CI 中恢复缓存是提速手段，源码、类型和测试仍按各自入口验证。

需要浏览器 E2E 时，再通过 Playground 自己的 Playwright 入口准备浏览器并执行；需要 npm 包发布验收时，按[tarball 独立消费测试](/debugging#tarball)安装真实产物。是否使用远程缓存和并行任务，按任务的输入、输出与副作用决定。

## 常用维护命令 {#maintenance}

以下命令在仓库根目录执行，按需要选择；更新版本、修复安装链接、清理包存储是不同操作，不是一套必须连续执行的流程。

### 查看项目与依赖

```bash
# 列出全部工作区及直接依赖，核对实际安装结果。
pnpm list -r --depth 0
# 查看可更新的版本，不安装更新。
pnpm outdated -r
```

### 更新依赖

```bash
# 递归更新，遵守现有声明范围。
pnpm update -r
# 只更新指定工作区，缩小本次改动范围。
pnpm --filter @zzjtnb/playground update
# 需要主动跨主版本升级时使用，升级前核对兼容范围与排除策略。
pnpm update -r --latest
```

--latest 可以改写清单和 catalog 中的版本范围。本项目排除 TypeScript 等兼容敏感依赖的批量升级；配置与维护方式见[依赖版本管理](/dependencies)。升级完成后审查清单和锁文件，再运行[检查与测试](#checks)。

### 按锁文件安装或重建安装链接

```bash
# 清单与锁文件必须一致；不重新解析并改写锁文件。
pnpm install --frozen-lockfile
# 确认需要修复安装或链接时强制重装；会执行允许的生命周期。
pnpm install --force
# 仅需重装、暂不运行生命周期时使用；之后需另行准备构建入口。
pnpm install --force --ignore-scripts
```

本项目的 postinstall 会构建公开包入口。跳过生命周期后应显式构建需要的包，不能把缺失 dist 误判为包解析或类型错误。重装前不必删除锁文件。

### 清理未使用的包存储

```bash
# 清理当前 pnpm store 中未引用的包内容，不删除工作区 node_modules 或锁文件。
pnpm store prune
```

之后再次需要被清理的内容时可能重新下载。store prune 不清理 Turbo 任务缓存，也不是每次安装前必须执行的步骤。

命令正式说明见 [update](https://pnpm.io/cli/update)、[install](https://pnpm.io/cli/install) 和 [store](https://pnpm.io/cli/store)。

## 清理、部署和发布的边界 {#boundaries}

Turbo 只执行已配置任务及项目脚本，没有一条能替所有项目判断哪些文件可以删除的通用清理任务。若项目提供 clean，确认它的实际行为，再决定是否通过 Turbo 调度。

```bash
# 本项目的清理由根独立脚本负责，先查看帮助，了解实际清理范围。
pnpm clean --help
# 查看根端口清理入口的用法，不立即结束任何进程。
pnpm ports --help
```

会修改源码、清理文件、发布版本或写入外部系统的任务，按职责设置 cache:false，不能复用旧的成功日志作为实际操作结果。

`pnpm deploy` 面向应用导出；三个配置包面向 npm 包消费，两者的验收流程分别维护。不要以整个工作区 build 成功代替三个公开包的独立安装、类型声明和规则覆盖验证；完整流程见[npm 包联调与发布前验证](/debugging)。

## 官方参考

- [Turborepo 入门](https://turborepo.dev/docs/getting-started/installation)
- [Turborepo 组织工作区](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository)
- [任务配置](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)
- [Turbo 配置字段](https://turborepo.dev/docs/reference/configuration)
- [运行与筛选任务](https://turborepo.dev/docs/reference/run)
- [环境变量](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
- [任务缓存](https://turborepo.dev/docs/crafting-your-repository/caching)
- [pnpm 工作区](https://pnpm.io/workspaces)
- [pnpm 筛选](https://pnpm.io/filtering)
- [依赖版本管理](/dependencies)

## VS Code 的 TypeScript SDK {#typescript-sdk}

类型检查使用各工作区安装的编译器；编辑器语言服务使用所选 SDK，两者不必来自根目录。以下以本项目为例：根目录不安装 TypeScript，Docs 的 TS6 依赖提供经典 tsserver.js，当前 Stylelint、Markdownlint 使用的 TS7 编译器不提供该经典语言服务。其他项目应选择自身实际包含 tsserver.js 的 SDK，不直接照搬示例目录。

### 目录模式与多根工作区

直接打开仓库目录时，SDK 设置由 `.vscode/settings.json` 提供。通过 `zzjtnb-lint-config.code-workspace` 打开多根工作区时，`js/ts.tsdk.path` 是窗口级设置，需要放在工作区文件的 `settings` 中，不能只依赖其中某个目录的设置。两种入口均指向实际安装的 `docs/node_modules/typescript/lib`。

```jsonc [zzjtnb-lint-config.code-workspace（设置节选）]
{
  "settings": {
    // 指向包含 tsserver.js 的 lib 目录，不是编译器可执行文件或 tsserver.js 文件本身。
    // 本仓库使用 Docs 已声明的 TS6 依赖，不为编辑器额外给根目录安装 TypeScript。
    "js/ts.tsdk.path": "docs/node_modules/typescript/lib",
  },
}
```

### 提示 SDK 无效时

1. 核对提示中的路径是否存在 `tsserver.js`。本仓库若提示根目录 `node_modules/typescript/lib/tsserver.js`，说明仍在使用旧路径。
2. 检查用户级、当前目录及多根工作区设置，确认当前窗口实际使用的 SDK；不要把编译器的存在等同于语言服务存在。
3. 在 VS Code 命令面板执行“TypeScript: 选择 TypeScript 版本”，选择有效工作区版本；也可选择编辑器内置版本作为临时回退。
4. 执行“TypeScript: 重启 TS 服务器”；切换打开方式或设置未刷新时，执行“开发人员: 重新加载窗口”。

如果 Docs 依赖尚未安装，先在仓库根目录执行 `pnpm install`，再检查 SDK 路径。不要为了消除提示创建虚假的 tsserver 文件，或给所有工作区重复安装同一套语言服务。
