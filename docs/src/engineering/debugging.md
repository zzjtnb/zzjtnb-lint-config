---
navigation:
  # 工程与维护侧栏中的页面名称。
  text: npm 包联调与验证
  # 与依赖版本管理同属工程主题。
  group: engineering
  # 位于依赖版本管理之后。
  order: 20
---

# npm 包本地联调与发布前验证

本文以 `@zzjtnb/eslint-config`、`@zzjtnb/stylelint-config`、`@zzjtnb/markdownlint-config` 为例，说明如何把本地修改交给真实项目验证，再检查打包和发布后的安装结果。

文中的“配置包仓库”指这三个包的源码仓库，“业务项目”指实际使用它们的项目，“独立消费项目”指专门验证发布产物的新项目。

跨仓库持续开发推荐使用 **声明式 `link:` 链接 + 配置包仓库根 `pnpm dev` 构建监听**；联调 Stylelint 时同时链接该仓库已安装的 Stylelint 引擎，具体操作见[推荐联调流程](#local-link)。同一 Monorepo 内使用 [workspace 联调](#monorepo)。修改后执行[三工具验证](#tool-checks)；发布前仍需执行 [tarball 消费测试](#tarball)，正式发布后执行[注册表版本验证](#published)。CLI 调试、本地注册表、npm 和 deploy 章节按需使用。

示例以 pnpm 为主，Shell 语法适用于 Bash、Zsh。先完成[环境与准备](#prerequisites)，再选择对应流程；PowerShell 需使用相应的变量和路径语法。每条命令上方均说明用途，包含“预期失败”的检查应逐条运行。

## 选择联调与验证方式 {#methods}

下表回答两个问题：现在应该选哪种方式，以及修改配置包后业务项目需要执行哪些更新步骤。

演示以 ESLint 包为例，另两个包采用相同方法。包目录在[公共变量](#paths)中设置；tarball、版本和注册表地址在对应流程中设置。表中的安装和 link 命令在业务项目根目录执行，workspace 配置写入消费工作区的 package.json。

| 方式 | 命令或配置示例 | 适用场景 | 更新步骤 |
| --- | --- | --- | --- |
| link（推荐） | `pnpm add -D "@zzjtnb/eslint-config@link:$ESLINT_DIR"` | 跨仓库持续联调，配合包仓库根 `pnpm dev` | 自动构建完成 → 重跑检查 |
| workspace | `"@zzjtnb/eslint-config": "workspace:*"` | Monorepo 内联调 | 构建 → 重跑检查 |
| file | `pnpm add -D "file:$ESLINT_DIR"` | 安装本地目录 | 构建 → 重装 → 检查 |
| tarball | `pnpm add -D "$ESLINT_TARBALL"` | 发布前验证 | 构建 → 打包 → 重装 → 检查 |
| 本地注册表 | `pnpm add -D "@zzjtnb/eslint-config@$ESLINT_VERSION" --registry "$LOCAL_REGISTRY"` | 完整发布演练 | 构建 → 发布 → 安装 → 检查 |
| npm 指定版本 | `pnpm add -D "@zzjtnb/eslint-config@$ESLINT_VERSION"` | 正式发布后验证 | 发布新版本 → 安装 → 检查 |
| 发布预演 | `pnpm --dir "$ESLINT_DIR" publish --dry-run` | 检查发布流程 | 不更新业务项目 |

“link”在这里统称本地链接方式。pnpm 的 `link:` 是依赖声明协议，`pnpm link` 是建立链接的命令，npm link 则使用 npm 的链接流程；它们在依赖安装、清单写入、全局状态及恢复方式上有区别。具体操作分别见[独立项目联调](#local-link)和[npm 对应操作](#npm)。

### 各方式的实际行为

- **link**：通过符号链接访问本地包目录，消费项目最终加载哪个文件仍由包的 `exports` 决定。链接不会自动把 src 编译成 dist，也不会替被链接包安装新增依赖；pnpm 命令式 link 还可能写入工作区 overrides，需要核对作用范围。
- **workspace**：从同一个工作区解析包，读取源码还是 dist 取决于 `exports`，不是使用 `workspace:*` 就一定直接执行源码。本项目的 TypeScript 入口指向 dist，Markdownlint 根入口指向 index.jsonc；工作区联调不能代替外部安装验证。
- **file**：按本地目录依赖参与安装和 peer 解析。消费项目中的文件更新受 pnpm 安装方式、构建工具替换文件和新增文件等行为影响，不能一概当作实时符号链接；必要时重新安装，并核对实际加载的文件。
- **tarball**：包文件是打包时的快照。之后修改源码、dist、JSONC 或清单，不会改变已经生成或安装的 tarball；需要重新构建所需产物、重新打包，再安装新的产物。它能验证实际发布文件，但不能验证注册表上传、认证或标签。
- **本地注册表**：安装的是发布到 Verdaccio 的版本快照，本地源码变化不会自动同步进去。需要重新生成产物、发布新的测试版本并安装；它用于验证完整发布链路，不能证明 npm 官方注册表的权限和发布状态。
- **npm 指定版本**：安装的是目标注册表中对应版本的文件，本地修改不会影响它。只有将修改发布为新版本并让业务项目安装该版本，才能验证正式发布后的效果；版本查询成功不代表安装和实际运行都成功。
- **发布预演**：`publish --dry-run` 不上传包，但会涉及发布生命周期和检查，可能执行构建、修改本地文件，并受 Git 状态、认证或安装策略影响。它不把产物安装进业务项目，也不能代替 tarball 消费测试或真实发布后验证。

### 链接中的引擎与解析器实例

目录链接保留包仓库自身的依赖位置。只链接配置包、在消费项目另装一个 Stylelint 引擎时，两边可能从不同的 node_modules 加载 PostCSS；即使包名和版本号相同，Node.js 也会按不同的解析路径加载成不同模块实例。Stylelint 17.16.0 的文档节点识别包含 `instanceof` 判断：HTML 解析器创建的节点来自另一份 PostCSS 时，判断可能失败，导致合法内联 style 被 `no-invalid-position-declaration` 误报。只统一版本号不能解决实例身份不同的问题。

处理方式是将本地配置包和配套 Stylelint 引擎一起链接到同一个配置仓库，让引擎和解析器共用其依赖图。按下方“诊断 → 修复 → 复查”执行；路径变量先按[公共变量](#paths)设置。

```bash
# 分别打印消费方 Stylelint 与共享包 HTML 解析器使用的 PostCSS 真实入口。
node --input-type=module <<'NODEJS'
import { realpathSync } from 'node:fs'
import { createRequire } from 'node:module'

const consumer = createRequire(`${process.cwd()}/package.json`)
const engine = createRequire(consumer.resolve('stylelint'))
const shared = createRequire(consumer.resolve('@zzjtnb/stylelint-config'))
const parser = createRequire(shared.resolve('postcss-html'))
console.log(realpathSync(engine.resolve('postcss')))
console.log(realpathSync(parser.resolve('postcss')))
NODEJS
```

两个路径应指向同一个 PostCSS 安装。路径不同时，在操作终端建立配套链接：

```bash
# 首次准备配置仓库，或它的依赖清单发生变化时执行；已有正确安装则跳过。
pnpm --dir "$LINT_REPO" install
# 将配置与引擎一并链接到配置仓库，避免消费项目另装第二套引擎；Monorepo 根目录加 -w。
pnpm --dir "$APP_REPO" add -D "stylelint@link:$LINT_REPO/node_modules/stylelint" "@zzjtnb/stylelint-config@link:$STYLELINT_DIR"
# 核对两个直接依赖均已指向预期本地位置。
pnpm --dir "$APP_REPO" list stylelint @zzjtnb/stylelint-config --depth 0
# 重新检查原来误报的真实文件；STYLE_FILE 替换为该 HTML 或 Vue 文件。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint "$STYLE_FILE"
```

重新执行上方路径诊断，两条路径应相同。合法内联样式不应再触发位置错误；普通 CSS 或 style 块中的非法根声明仍应被报告。此方案不关闭规则，不额外安装解析器，也不添加 PostCSS override。

配套链接只需建立一次。以后修改配置包源码，等待构建监听完成，再在消费项目重跑检查，无需反复安装。结束本地联调时，按[恢复依赖](#restore)同时恢复配置包与 Stylelint 引擎的正式版本范围；发布验证仍使用注册表版本或 tarball，不发布本机链接。

### 修改配置包后如何更新业务项目

- **修改 TypeScript 源码**：ESLint、Stylelint 的 `src/**/*.ts`，以及 Markdownlint 的 `src/index.ts`，都需要先构建对应包。已有 `dev` 监听进程时，等它完成构建即可，不再同时启动另一轮 build。
- **只修改 Markdownlint 的 `index.jsonc` 规则**：使用 link 或 workspace 时，无需构建，重新运行业务项目的 CLI2；使用 file、tarball 或注册表版本时，还需按表格刷新安装内容。
- **修改配置包内部依赖**：修改包仓库的 dependencies 后，在配置包仓库安装依赖并构建；已有 `link:` 消费项目不需要因此逐个安装。
- **修改消费方引擎或 peer 要求**：只有受影响的消费项目需要更新自身的 ESLint、Stylelint、CLI2 等依赖并安装；不要求无关项目重复安装。
- **修改公开入口**：`exports` 指向的文件需要先生成，再由消费进程重新加载；单纯修改 `exports` 不需要重装目录链接。改了链接路径、包名或消费方依赖声明时，才在受影响的消费项目安装。tarball 和注册表快照仍需重新打包或发布后安装。
- **修改声明或打包清单**：重新构建所需声明或资源，并通过新 tarball 检查最终文件；本地链接无法证明 files 等发布设置正确。

已建立的 link 和 workspace 会指向本地包目录，**日常修改源码、规则或构建产物不需要消费项目重新安装**。但文件已更新不代表运行中的程序已重新加载：编辑器扩展、Node.js 服务等长驻进程需要重新加载配置或重启，再运行检查。

### 工作区筛选、命令执行与应用导出示例

以下示例在配置包仓库根目录执行，用于区分筛选、命令执行和应用导出。先完成[环境与准备](#prerequisites)，再按需选择：

```bash
# --filter 选择实际工作区：这里只构建 ESLint 配置包。
pnpm --filter @zzjtnb/eslint-config run build
# exec 执行该消费工作区已安装的 ESLint，检查其真实源码文件。
pnpm --filter @zzjtnb/lint-demo exec eslint src/greeting.ts
# dlx 在临时环境安装固定版本的 CLI2 并运行帮助，不使用配置包名冒充命令。
pnpm dlx --package=markdownlint-cli2@0.24.0 markdownlint-cli2 --help
# 为 deploy 创建临时父目录，不清理已有产物。
mkdir -p .tmp/demo-deploy
# 在用途目录内创建此次验证随机子目录，避免覆盖已有应用导出。
DEPLOY_PARENT="$(mktemp -d .tmp/demo-deploy/XXXXXX)"
# deploy 导出实际消费应用及依赖；demo 的检查工具是开发依赖，因此不加 --prod。
pnpm --filter @zzjtnb/lint-demo deploy --legacy "$DEPLOY_PARENT/demo"
# 从导出的独立应用执行其检查脚本，验证应用所需文件与依赖。
pnpm --dir "$DEPLOY_PARENT/demo" run lint
```

`--filter` 限定工作区；`exec` 使用该项目安装的命令；`dlx` 临时安装工具后执行；`deploy` 导出应用及依赖。包的发布文件和外部安装通过 [tarball 消费测试](#tarball)验证，应用导出的具体条件见 [deploy](#deploy)。

## 明确三个包的入口与环境 {#prerequisites}

### 公开入口与执行工具

| 配置包 | 公开入口 | 业务项目执行工具 |
| --- | --- | --- |
| ESLint | 根入口 `dist/index.mjs` | `eslint`，满足包的 peer 范围 |
| Stylelint | 根入口 `dist/index.mjs` | `stylelint`，满足包的 peer 范围 |
| Markdownlint | 根入口 `index.jsonc`；`/config` 为 `dist/index.mjs` | `markdownlint-cli2`；该包的可选 peer，运行 CLI 时由消费项目安装 |

三个 ESM 构建入口的类型声明均为相邻的 `dist/index.d.mts`。修改 TypeScript 源码后构建，单独修改 JSONC 规则时直接重新读取；不同安装方式的刷新步骤见[修改配置包后的操作](#methods)。

三个包互不依赖，可单独安装，也可组合使用。ESLint 包提供具名 `zzjtnb()`，没有默认运行时导出；Stylelint 同时提供具名工厂和供原生 `extends` 加载的默认对象；Markdownlint 的 JSONC 根入口用于规则继承，`/config` 用于共享 CLI2 扫描选项和规则。

它们是配置包，**没有自己的 `bin` 命令**。`eslint`、`stylelint`、`markdownlint-cli2` 来自对应工具包，不要执行 `pnpm exec @zzjtnb/eslint-config`，也不要给三个配置包添加并不存在的 CLI 入口。

环境要求以各包说明为准：[ESLint](/eslint)、[Stylelint](/stylelint)、[Markdownlint](/markdownlint)。仓库开发环境、包自身运行环境、消费项目 TypeScript 编译器和 TS 配置加载器是不同要求。本文统一采用 `.js` 配置，项目声明 `"type": "module"`；直接加载 ESM，不需要额外 TS 配置加载器。

### 公共变量 {#paths}

以下变量贯穿后续示例，先替换成自己的实际位置。`APP_REPO` 始终指向原业务项目，不会在 tarball 或注册表验证中被重新赋值；临时消费项目使用各流程自己的变量。含空格的路径保留引号，新终端需重新设置本次流程所用变量。

```bash
# 本仓库根目录，不是 packages 下的某个包目录。
LINT_REPO="$HOME/projects/zzjtnb-lint-config"
# 表格演示使用的本地 ESLint 包目录，由仓库位置派生。
ESLINT_DIR="$LINT_REPO/packages/eslint"
# 本地 Stylelint 包目录。
STYLELINT_DIR="$LINT_REPO/packages/stylelint"
# 本地 Markdownlint 包目录。
MARKDOWNLINT_DIR="$LINT_REPO/packages/markdownlint"
# 已有的独立业务项目；应位于本仓库之外。
APP_REPO="$HOME/projects/your-app"
# ESLint 的真实目标文件，路径相对于消费项目根目录。
TARGET_FILE="src/local-check.ts"
# Stylelint 的真实目标文件，避免用 stylelint . 扫描全部格式。
STYLE_FILE="src/local-check.css"
# Markdownlint 的真实目标文件，应存在且不被忽略。
MARKDOWN_FILE="LOCAL-CHECK.md"
# npm 官方注册表；私有包改用其所属注册表及既有认证配置。
NPM_REGISTRY="https://registry.npmjs.org/"
# 独立消费验证工作区，不放在源码仓库或已有 node_modules 的项目内。
CHECK_WORKSPACE="$HOME/projects/lint-package-check"
# 该验证工作区的临时目录，后续按用途分层。
CHECK_ROOT="$CHECK_WORKSPACE/.tmp/package-consumers"
```

示例配置应合并进已有业务配置，不要覆盖项目原有的文件范围、忽略、规则、自定义模块和编辑器设置。需要从零复现时，优先使用[tarball 独立安装验证](#tarball)的新建隔离项目。

### 安装、构建和包内测试

```bash
# 在本仓库根目录安装工作区依赖；安装可能执行已有生命周期。
pnpm --dir "$LINT_REPO" install
# 构建 ESLint 的 ESM 入口与声明。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/eslint-config run build
# 构建 Stylelint 的 ESM 入口与声明。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/stylelint-config run build
# 构建 Markdownlint 的 /config 扫描入口与声明。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/markdownlint-config run build
# 统一检查三个包的源码、测试和构建配置类型。
pnpm --dir "$LINT_REPO" --filter '@zzjtnb/*-config' run typecheck
# 运行三个包的 Vitest 测试，并在完成后退出。
pnpm --dir "$LINT_REPO" --filter '@zzjtnb/*-config' run test --run
# 用仓库根 ESLint 配置检查包目录，不隐式安装缺失依赖。
pnpm --config.verifyDepsBeforeRun=error --dir "$LINT_REPO" exec eslint packages
```

只联调一个包时，选择它自己的 build、typecheck 和 test 即可。Markdownlint 仅修改 `index.jsonc` 时不需要重新编译规则文件，但验证 `/config`、声明和完整发布产物仍需要 build。

## 独立项目联调 {#local-link}

### 推荐流程：声明式链接与根构建监听

首次联调先完成[环境与准备](#prerequisites)，确保配置包仓库已安装依赖并生成初始产物。然后在消费项目声明 `link:`；选择实际需要的包执行，不必为了测试一个包安装全部工具。Monorepo 根目录添加依赖时，下方 add 命令增加 `-w`：

```bash
# 安装 ESLint 引擎，并将配置依赖指向本地包目录。
pnpm --dir "$APP_REPO" add -D 'eslint@^10.13.0' "@zzjtnb/eslint-config@link:$ESLINT_DIR"
# 将 Stylelint 引擎和配置包一并链接到同一仓库，共用解析器的 PostCSS 实例。
pnpm --dir "$APP_REPO" add -D "stylelint@link:$LINT_REPO/node_modules/stylelint" "@zzjtnb/stylelint-config@link:$STYLELINT_DIR"
# 安装 CLI2，并链接 Markdownlint 的规则与扫描配置包。
pnpm --dir "$APP_REPO" add -D 'markdownlint-cli2@^0.24.0' "@zzjtnb/markdownlint-config@link:$MARKDOWNLINT_DIR"
# 确认消费项目安装的是本地路径，而不是原来的注册表版本。
pnpm --dir "$APP_REPO" list eslint stylelint markdownlint-cli2 @zzjtnb/eslint-config @zzjtnb/stylelint-config @zzjtnb/markdownlint-config --depth 0
```

`link:` 创建符号链接；被链接包的依赖应先在其所属仓库安装。清单里明确保存本地来源，不需要先注册全局链接。已有真实业务项目执行这些命令会改变其清单和锁文件。持续联调期间保留链接；结束联调后切回正式版本并重新安装，不将本机路径作为正式发布依赖。

如果首次在消费项目的 `package.json` 中手动把原依赖改为 `link:../zzjtnb-lint-config/packages/eslint`，该路径相对于这份 package.json。保存这次依赖声明后，在该消费项目执行一次 `pnpm install` 建立链接。前面的 `pnpm add 包名@link:路径` 已完成安装，不需要再执行一次 install。此后只改配置包源码或规则，不需要消费项目重装；只有消费方依赖声明、包名或链接路径再次变化时才重新安装。命令中使用绝对路径可以减少启动目录变化造成的歧义。

完成链接后，在另一个终端运行配置包仓库的根开发命令：

```bash
# 同时启动三个配置包的构建监听、文档站与 Playground；终端保持运行。
pnpm --dir "$LINT_REPO" dev
```

`link:` 与 `pnpm dev` 职责不同：前者建立消费项目到本地包目录的链接；后者通过 Turbo 启动三个包的 `tsdown --watch`，同时启动文档站和 Playground，本身不创建链接。两者配合后，修改配置包源码会触发构建并更新 `dist`。等待构建成功，再在消费项目重新执行检查即可读取新配置，无需重复打包或安装。修改 Markdownlint 根 `index.jsonc` 不需要构建；修改它的 `/config` 扫描入口仍需要等待构建。

如果消费项目仍使用 `file:*.tgz`，根 `pnpm dev` 不会更新已安装的压缩包快照，必须先按[声明式链接](#local-link)改为本地目录链接并安装。内部依赖、消费方依赖和公开导出的更新步骤不同，按[修改配置包后如何更新业务项目](#修改配置包后如何更新业务项目)处理，普通源码更新不需要消费项目重新安装。已有检查缓存可能影响复查，应使用[不带缓存的单文件检查](#tool-checks)确认新行为；编辑器检查服务和其他长驻进程可能缓存模块，需要重启，不能把构建监听等同于运行时热更新。

### 命令式链接（`pnpm link`）

先安装消费方所需工具，再从消费项目链接所选包：

```bash
# 将指定目录的包链接到消费项目，包名从被链接包的 package.json 读取。
pnpm --dir "$APP_REPO" link "$ESLINT_DIR"
# 核对链接后的实际来源。
pnpm --dir "$APP_REPO" why @zzjtnb/eslint-config
# 检查命令修改了哪些清单、锁文件或工作区 overrides。
git -C "$APP_REPO" diff
```

Stylelint 的命令式联调同样需要链接配置仓库的引擎，优先使用上一节的配套声明式链接。

不同 pnpm 主版本对 `link` 的持久化方式有差异。当前 pnpm 的命令式链接可能写入根 `pnpm-workspace.yaml` 的 `overrides`，使替换作用于工作区；不要把它当成完全不改清单的临时操作。恢复时使用 `pnpm unlink` 并核对 overrides。需要清楚控制单个消费包的声明时，优先选上一节的 `add 包名@link:路径`。

### 本地目录安装（`file:` 或目录路径）

```bash
# 将同名依赖改成本地 file: 安装；这会替换之前的 link: 声明。
pnpm --dir "$APP_REPO" add -D "@zzjtnb/eslint-config@file:$ESLINT_DIR"
# Stylelint 也可以用相同方式参与本地依赖安装。
pnpm --dir "$APP_REPO" add -D "@zzjtnb/stylelint-config@file:$STYLELINT_DIR"
# Markdownlint 的本地目录安装仍同时包含 JSONC 根入口和已构建的 /config。
pnpm --dir "$APP_REPO" add -D "@zzjtnb/markdownlint-config@file:$MARKDOWNLINT_DIR"
# 裸目录路径也可安装；安装后核对实际记录的协议，不与符号链接语义混淆。
pnpm --dir "$APP_REPO" add -D "$ESLINT_DIR"
```

`file:` 走本地包安装流程，pnpm 官方建议在需要解析消费方 peer dependency 时使用它。不要据此认为任意构建工具“删除旧文件再写入”后都会实时同步：如果消费方没有读到变化，重新构建并重新安装，再核对入口文件。

对 Vue、React 等宿主依赖，重复实例可能导致运行时错误，通常应通过 peer 声明和消费项目的直接依赖对齐。三个配置包的 peer 主要是检查引擎，不应要求消费方把本包内部 parser、preset 和 plugin 全部再安装一次。

### 修改以后如何复查

日常只改源码时，在配置包仓库等待已有监听构建完成，再执行下方最后一条检查命令即可。没有监听进程时，先运行对应包的 build。前两条 install 仅在注释所述的依赖声明或链接发生变化时执行，不是每次源码修改后的步骤：

```bash
# 仅配置包仓库新增或更新依赖时执行；普通源码修改跳过。
pnpm --dir "$LINT_REPO" install
# 仅此消费项目首次手改 link 声明，或自身依赖、链接路径变化时执行。
pnpm --dir "$APP_REPO" install
# 没有构建监听时更新 ESLint 产物；已有 pnpm dev 时等待构建完成，不重复 build。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/eslint-config run build
# 用同一个输入文件重查，先不修复，便于比较诊断。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint "$TARGET_FILE"
```

声明式链接下的根开发命令与生效边界见[推荐联调流程](#local-link)。

只需联调某一个包、不启动文档站和 Playground 时，可以在另一个终端监听对应包：

```bash
# 监听 ESLint 源码并持续更新 dist；终端保持运行。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/eslint-config run dev
# 仅联调 Stylelint 时，在它自己的终端监听构建。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/stylelint-config run dev
# 修改 Markdownlint 的 TypeScript 扫描配置时监听 /config 构建。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/markdownlint-config run dev
```

修改 Markdownlint 的 `index.jsonc` 后重新执行 CLI2 即可读取新规则。长驻进程和编辑器可能缓存模块，需要重启消费程序或重新加载扩展；watch 构建不是所有消费方的热更新保证。生成 dist 时不要同时启动会清空同一 dist 的另一轮构建。

## 同一个 Monorepo 中联调 {#monorepo}

工作区搭建、根脚本、Turbo 任务图、缓存和 CI 的完整说明见 [Turborepo 与 pnpm](/monorepo)。本节只说明配置包与业务项目之间的本地依赖和联调命令。

### 使用 workspace 协议

本项目的 `apps/demo` 已是实际消费工作区，包名为 `@zzjtnb/lint-demo`，通过 `workspace:*` 使用三个配置包。独立业务 Monorepo 可以采用同样关系：

```yaml [pnpm-workspace.yaml]
# 按真实目录声明工作区，不覆盖已有目录和其他 pnpm 设置。
packages:
  - packages/*
  - apps/*
```

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

`name` 用于选择工作区，`private: true` 阻止示例应用发布，`devDependencies` 保存只在开发检查中使用的配置包。三个执行引擎仍由消费工作区直接声明，完整依赖以实际 `apps/demo/package.json` 为准。

| workspace 声明 | 解析及打包行为 |
| --- | --- |
| `workspace:*` | 必须存在本地同名包；打包时转换为其精确版本 |
| `workspace:^` | 本地解析；打包时转换为带 `^` 的当前版本范围 |
| `workspace:~` | 本地解析；打包时转换为带 `~` 的当前版本范围 |
| `workspace:1.0.5` | 要求本地包版本满足所写值；此版本只是语法示例 |
| `workspace:../eslint` | 用工作区相对位置引用；路径相对于声明方，仍需属于工作区 |

生产代码真正运行时需要的库放 `dependencies`，本项目的检查配置和工具放 `devDependencies`。`workspace:` 必须在相应工作区关系内解析，不应原样泄漏到发布给外部用户的清单中。

### 定向构建、测试与监听

```bash
# 从工作区根安装，建立声明的包关系。
pnpm --dir "$LINT_REPO" install
# 单独构建 ESLint 包。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/eslint-config run build
# 构建三个公开配置包，不顺带构建 Docs 和 Playground。
pnpm --dir "$LINT_REPO" --filter '@zzjtnb/*-config' run build
# 运行三个包的契约测试，--run 避免测试监听常驻。
pnpm --dir "$LINT_REPO" --filter '@zzjtnb/*-config' run test --run
# 在真实消费示例中检查代码、样式和 Markdown。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/lint-demo run lint
# 在同一个消费示例中执行单元测试。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/lint-demo run test --run
# 另开终端监听所修改的包；不要同时重建同一输出目录。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/eslint-config run dev
```

给工作区添加依赖时也应限定消费方，例如：

```bash
# 将 ESLint 配置作为指定消费示例的工作区开发依赖；已有声明无需重复执行。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/lint-demo add -D '@zzjtnb/eslint-config@workspace:*'
```

带 `...` 的筛选模式也可选择依赖关系；例如 `@zzjtnb/stylelint-config...` 包含该包及其工作区依赖。运行前先确认实际选择范围，不用无筛选的递归命令替代只检查核心包的任务。

### 源码调试和 dist 调试的区别

ESLint、Stylelint 及 Markdownlint 的 TypeScript 扫描入口保持 `exports` 指向 dist，通过 `dev` 监听构建；Markdownlint 根规则直接读取 index.jsonc。消费方始终按包名导入，这样测试的入口与发布入口一致。

通用库也可使用工具支持的开发条件导出或显式源码别名，交给 Vite 转换；但这只验证源码协作，不能证明发布后的 Node.js 入口或声明正确。不要为了联调临时把本项目的公开导出改成 `src/index.ts`，再把这种结果当作发布验收。

## 三个包的真实配置、检查与覆盖验证 {#tool-checks}

### ESLint：具名工厂与后置配置

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 本示例把 Markdown 正文交给 CLI2，避免重复报告。
  markdown: false,
  // 消费方按规则名覆盖共享值，未列出的规则继续继承。
  rules: {
    // 共享配置对 console.log 报告 warn；提高到 error，用于验证检查失败与消费方覆盖。
    'no-console': 'error',
  },
})
```

如果还要给个别文件设置例外，可以通过后续 Flat Config 片段覆盖：

```js [eslint.config.js（文件级覆盖）]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // 全局要求禁止 console。
    rules: { 'no-console': 'error' },
  },
  {
    // 只对脚本目录应用例外，不改变其他文件。
    files: ['scripts/**/*.ts'],
    // 后续匹配配置的同名规则优先。
    rules: { 'no-console': 'off' },
  },
)
```

以消费项目中实际存在的文件验证；例如 `src/local-check.ts` 包含 `console.log('local check')` 时，应出现 `no-console`。先读最终配置，再运行真实检查，最后才请求修复：

```bash
# 打印指定文件合并后的配置，不执行 lint。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint --print-config "$TARGET_FILE"
# 真实检查同一个文件，不写回源码。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint "$TARGET_FILE"
# 确认输入和诊断后应用自动修复；no-console 等问题仍可能需要手动修改。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint "$TARGET_FILE" --fix
# 通过 ESLint 官方配置检查器查看文件匹配及规则来源；首次可能下载工具。
pnpm --dir "$APP_REPO" dlx @eslint/config-inspector
```

ESLint 的 `.js`、`.mjs` 配置也可以使用相同 ESM 工厂写法；`.js` 要求消费项目声明 `type: module`。本包没有 default runtime export，不用 `import config from '@zzjtnb/eslint-config'`。

### Stylelint：工厂或原生继承

选择一种写入业务项目的 stylelint.config.js：

::: code-group

```js [stylelint.config.js（工厂）]
import { zzjtnb } from '@zzjtnb/stylelint-config'

export default zzjtnb({
  // 按规则名覆盖共享值，保留其他语法及文件配置。
  rules: {
    // 关闭共享类名约束，用于验证消费方覆盖。
    'selector-class-pattern': null,
  },
})
```

```js [stylelint.config.js（原生继承）]
export default {
  // 由 Stylelint 加载共享默认对象。
  extends: ['@zzjtnb/stylelint-config'],
  // 原生配置中也可以追加项目规则。
  rules: {
    // null 按 Stylelint 原生语义关闭类名约束。
    'selector-class-pattern': null,
  },
}
```

:::

先使用含 `.Invalid_Name` 的合法 CSS 测试：默认共享配置应报告类名规则，应用上述覆盖后该项诊断消失。另保留一个非法颜色等错误，确认检查没有被整体关闭。文件级规则的覆盖应使用匹配该文件的 `overrides`；工厂的多参数合并与原生 `extends` 的详细顺序见[详细配置](/stylelint/configuration)。

```bash
# 输出一个实际文件的 parser 和最终规则，不执行修复。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint --print-config "$STYLE_FILE" --config stylelint.config.js
# 检查指定文件，不用 stylelint . 扫描其他格式。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint "$STYLE_FILE" --config stylelint.config.js
# 对实际项目样式范围运行检查，宽 glob 明确使用项目根配置。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint '**/*.{css,scss,vue,html,htm}' --config stylelint.config.js
# 对相同范围请求自动修复；缓存位置与项目脚本保持一致。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint '**/*.{css,scss,vue,html,htm}' --config stylelint.config.js --fix --cache --cache-location node_modules/.cache/.stylelintcache
```

联调优先用单文件、无缓存检查。缓存用于重复检查提速，不能证明修改过的共享配置已重新加载。更改配置文件名时同步调整命令中的 `--config`，确认读取的是当前 ESM 配置。

### Markdownlint：共享扫描或仅继承规则

::: code-group

```js [.markdownlint-cli2.mjs（共享扫描与规则）]
import shared from '@zzjtnb/markdownlint-config/config'

export default {
  // 继承 Git 忽略和共享扫描排除，不复制通用路径列表。
  ...shared,
  // 保留 JSONC 规则入口，再应用消费方规则。
  config: {
    ...shared.config,
    // 默认不限制行长；这里重新开启并指定 120 字符阈值。
    MD013: { line_length: 120 },
  },
}
```

```jsonc [.markdownlint-cli2.jsonc（仅继承规则）]
{
  // 读取项目 Git 忽略配置。
  "gitignore": true,
  // JSONC 的规则继承不带入 /config 扫描选项，按项目声明所需排除。
  "ignores": ["**/node_modules/**", "**/dist/**"],
  // 此对象只维护 Markdownlint 规则。
  "config": {
    // 原生加载本包根 JSONC 规则。
    "extends": "@zzjtnb/markdownlint-config",
    // 覆盖共享的行长设置。
    "MD013": { "line_length": 120 },
  },
}
```

:::

只用默认值时，MJS 可以直接 `export { default } from '@zzjtnb/markdownlint-config/config'`。MJS 和 JSONC 二选一；同目录还有 `.markdownlint.*` 规则文件时，它可能覆盖 CLI2 中的 `config`，需要确认唯一规则来源。自定义规则模块仍由 CLI2 顶层的 `customRules` 加载，不属于 `config` 内的扫描选项。

用一行含空格、超过 120 字符的普通段落验证 `MD013`。不要仅使用没有断点的超长 URL 或单词，因为它可能属于原生规则豁免。还可以通过同级重复标题验证默认 `MD024` 仍在检查。

```bash
# 检查目标 Markdown，按当前选择的 MJS 或 JSONC 自动发现配置。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec markdownlint-cli2 "$MARKDOWN_FILE"
# 对同一个文件应用引擎实际提供的自动修复。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec markdownlint-cli2 --fix "$MARKDOWN_FILE"
# 需要显式指定 MJS 配置时使用此命令；选择 JSONC 时同步替换文件名。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec markdownlint-cli2 --config .markdownlint-cli2.mjs '**/*.md'
```

### 检查结果如何判断

前面的三条链接命令都执行时，业务项目同时联调三个配置包。分别运行三个工具的检查和修复命令；不要用某一工具通过代表全部通过。编辑器也需遵循同一分工，设置方法见[三工具编辑器配置](/quick-start#编辑器配置)。

| 对象 | 至少验证一次 |
| --- | --- |
| ESLint | 目标文件被检查、默认规则生效、首参及文件片段覆盖、修复后复查 |
| Stylelint | 实际使用的 CSS/SCSS/Vue/HTML 可解析、默认规则与覆盖、无非法选项、修复后复查 |
| Markdownlint | JSONC 根入口、MJS 的 /config 入口、扫描排除、违规诊断、消费方覆盖和修复 |
| 所有包 | 公开包名可解析、类型入口可用、产物文件完整、未依赖源码仓库的偶然环境 |

预期失败输入应返回非零并报告目标规则；修正输入或按契约覆盖后，目标诊断应消失。文件被忽略、没有匹配文件或规则未启用，不算规则验证成功。

## 发布前：pack 与独立安装 {#tarball}

### 构建并生成三个 tarball

此次验证打包前重新构建三个包，确保 tarball 对应当前源码。包的 `prepublishOnly` 用于发布前构建，不应假定 pack 会调用它。若另一个包使用 `prepack` 或 `prepare`，pack 和 dry-run 的生命周期按该包与包管理器版本执行，不能理解为绝对无副作用。

```bash
# 为这轮待打包源码更新三个公开包的产物。
pnpm --dir "$LINT_REPO" --filter '@zzjtnb/*-config' run build
# 每轮使用新打包目录，保留已有 tarball 和失败现场。
mkdir -p "$LINT_REPO/.tmp/local-consumer/pack"
# 在打包用途目录中创建此次验证子目录，避免同版本旧包被误用。
PACK_DIR="$(mktemp -d "$LINT_REPO/.tmp/local-consumer/pack/XXXXXX")"
# 预览 ESLint 包的发布文件清单，不上传注册表。
pnpm --dir "$ESLINT_DIR" pack --dry-run
# 预览 Stylelint 的文件清单。
pnpm --dir "$STYLELINT_DIR" pack --dry-run
# 预览 Markdownlint 根规则与扫描入口的文件清单。
pnpm --dir "$MARKDOWNLINT_DIR" pack --dry-run
# 用当前 pnpm 的 --out 为此次验证 ESLint tarball 指定明确文件名。
pnpm --dir "$ESLINT_DIR" pack --out "$PACK_DIR/eslint-config.tgz"
# 生成同一轮 Stylelint tarball。
pnpm --dir "$STYLELINT_DIR" pack --out "$PACK_DIR/stylelint-config.tgz"
# 生成同一轮 Markdownlint tarball。
pnpm --dir "$MARKDOWNLINT_DIR" pack --out "$PACK_DIR/markdownlint-config.tgz"
# 保存三个产物的完整路径，后续安装不使用可能匹配多份旧包的通配符。
ESLINT_TARBALL="$PACK_DIR/eslint-config.tgz"
# 保存 Stylelint 产物路径。
STYLELINT_TARBALL="$PACK_DIR/stylelint-config.tgz"
# 保存 Markdownlint 产物路径。
MARKDOWNLINT_TARBALL="$PACK_DIR/markdownlint-config.tgz"
# 查看 ESLint 包内实际文件。
tar -tf "$ESLINT_TARBALL"
# 查看 Stylelint 包内实际文件。
tar -tf "$STYLELINT_TARBALL"
# 查看 Markdownlint 包内实际文件。
tar -tf "$MARKDOWNLINT_TARBALL"
# 核对打包后的 ESLint 清单，而不是仅看源码清单。
tar -xOf "$ESLINT_TARBALL" package/package.json
# 核对打包后的 Stylelint 依赖及入口。
tar -xOf "$STYLELINT_TARBALL" package/package.json
# 核对 Markdownlint 的根导出、/config 和发布文件范围。
tar -xOf "$MARKDOWNLINT_TARBALL" package/package.json
```

也可用 `pack --pack-destination "$PACK_DIR"` 保留按包名和版本生成的文件名；此时从 pack 输出选择此次验证准确文件，不假设三个包永远同号。旧 pnpm 不支持某参数时先核对 `pnpm help pack`，不要改用手动压缩源码目录。

### 检查产物清单

| 检查项 | 本项目的验证重点 |
| --- | --- |
| `files` | ESLint/Stylelint 的 dist 和说明；Markdownlint 另含 index.jsonc |
| `exports` | 三包根入口均存在；Markdownlint 的 /config 指向真实 ESM 文件 |
| 类型声明 | dist/index.d.mts 随包存在，消费方能解析公开类型 |
| `dependencies` | preset、parser、API 运行时依赖完整，不能靠仓库开发依赖补齐 |
| `peerDependencies` | ESLint/Stylelint 引擎由消费方按兼容范围直接安装 |
| `workspace:` / `catalog:` | 外部消费所用的依赖范围已转换，不要求消费项目复制本仓库 catalog |
| ESM/CJS | 本项目公开 TypeScript 配置包使用 ESM；不伪造 CJS 支持承诺 |
| 包内资源路径 | Markdownlint 扫描入口能定位同包 JSONC，不引用开发机源码绝对路径 |
| `bin` | 这三个包不应意外发布不存在的 CLI；真正 CLI 包另检查入口与权限 |

### 创建独立消费项目

独立消费验证使用单独的工作区，其自身及祖先目录不应安装本项目的开发依赖，以免 Node.js 沿父目录解析时掩盖缺失依赖。临时消费项目统一放在这个验证工作区的 `.tmp/` 下，按 tarball、registry、published 分目录；每一轮使用新的随机子目录。

```bash
# 创建 tarball 验证用途目录，保留其他轮次。
mkdir -p "$CHECK_ROOT/tarball"
# 新建此次验证消费项目，随机名称只用于隔离同类验证。
CONSUMER="$(mktemp -d "$CHECK_ROOT/tarball/XXXXXX")"
# 初始化明确使用 ESM 的独立消费项目。
pnpm --dir "$CONSUMER" init --init-type module
# 显式安装执行工具和此次验证三个真实 tarball。
pnpm --dir "$CONSUMER" add -D 'eslint@^10.13.0' 'stylelint@^17.16.0' 'markdownlint-cli2@^0.24.0' "$ESLINT_TARBALL" "$STYLELINT_TARBALL" "$MARKDOWNLINT_TARBALL"
# 核对独立项目实际安装的直接依赖及来源。
pnpm --dir "$CONSUMER" list --depth 0
# 核对已安装工具的 peer 兼容性。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" peers check
```

单包发布测试也要做：分别创建独立项目，只安装待验证配置包及它需要的引擎，避免另两个包的依赖意外补齐缺失项。组合测试与单包测试互相补充。

### 验证公开入口

```bash
# 切换到独立项目，所有包名都从这里的 node_modules 解析。
cd "$CONSUMER"
# 调用真实工厂，并检查 Markdownlint 两个公开入口。
node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { zzjtnb as eslintConfig } from '@zzjtnb/eslint-config'
import stylelintDefault, { zzjtnb as stylelintConfig } from '@zzjtnb/stylelint-config'
import markdownConfig from '@zzjtnb/markdownlint-config/config'

// 工厂应能完成组装，不能只测试模块导入。
console.log('ESLint 配置数量：', (await eslintConfig({ pnpm: false })).length)
console.log('Stylelint 默认对象和工厂：', Array.isArray(stylelintDefault.extends), Array.isArray(stylelintConfig().extends))
// JSONC 根入口按配置文件定位，/config 按 ESM 加载。
console.log('Markdownlint 根规则：', createRequire(import.meta.url).resolve('@zzjtnb/markdownlint-config'))
console.log('Markdownlint 扫描入口：', markdownConfig.config.extends, markdownConfig.ignores)
NODE
```

上面的输出应包含有效配置数量、两个 Stylelint 入口以及独立项目内的 Markdownlint 规则路径。接着，把[三工具配置](#tool-checks)中的配置保存到这个新项目：ESLint 使用首个 no-console 示例；Stylelint 的两种写法选一种；Markdownlint 的 MJS/JSONC 选一种。

### 用同一组输入验证失败与成功

以下命令只在新建的 CONSUMER 中创建测试文件，不修改 APP_REPO。文件名与公共变量中的三个目标路径一致：

```bash
# 进入此次验证独立项目。
cd "$CONSUMER"
# 创建目标源码目录。
mkdir -p src
# 生成三个有意违反规则的输入，便于确认各工具确实执行检查。
node --input-type=module <<'NODE'
import { writeFileSync } from 'node:fs'

writeFileSync('src/local-check.ts', "console.log('local check')\n")
writeFileSync('src/local-check.css', '.Invalid_Name { color: #GGG; }\n')
writeFileSync('LOCAL-CHECK.md', '# Local check\n\n' + 'word '.repeat(32).trim() + '\n')
NODE
# 预期失败：消费方重新启用的 no-console 应报告错误。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec eslint "$TARGET_FILE"
# 预期失败：关闭类名约束后，非法颜色仍应被检查。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec stylelint "$STYLE_FILE" --config stylelint.config.js
# 预期失败：含空格的长段落应触发消费方开启的 MD013。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec markdownlint-cli2 "$MARKDOWN_FILE"
```

三条检查都应返回非零并报告对应规则，应逐条查看结果。接着修正同一组输入：

```bash
# 仍在此次验证独立项目中操作。
cd "$CONSUMER"
# 移除 console，改用合法类名和颜色，并缩短 Markdown 段落。
node --input-type=module <<'NODE'
import { writeFileSync } from 'node:fs'

writeFileSync('src/local-check.ts', 'export const localCheck = 1\n')
writeFileSync('src/local-check.css', '.demo { color: red; }\n')
writeFileSync('LOCAL-CHECK.md', '# Local check\n\nA short paragraph.\n')
NODE
# 验证 TS 输入在同一份配置下不再触发原错误。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec eslint "$TARGET_FILE"
# 验证 CSS 输入，配置文件保持不变。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec stylelint "$STYLE_FILE" --config stylelint.config.js
# 验证短段落，保留原 MD013 覆盖设置。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec markdownlint-cli2 "$MARKDOWN_FILE"
```

只有修正了输入或按契约覆盖规则后诊断才应消失；通过忽略整份文件得到零错误，不算验证成功。自动修复命令与其能力范围见[三工具验证](#tool-checks)。

### 验证消费方类型声明

仅包内 typecheck 不能证明发布声明可用。在独立消费项目中安装符合包要求的编译器及所需类型；例如使用 TS6 检查公开工厂类型和配置加载需求：

```bash
# 只给独立验证项目安装编译器和 Node 类型，不修改原业务项目编译器。
pnpm --dir "$CONSUMER" add -D 'typescript@^6.0.3' @types/node
```

```ts [consumer-types.ts]
import type { ESLintConfigOptions } from '@zzjtnb/eslint-config'
import type { Config } from '@zzjtnb/stylelint-config'
import { zzjtnb as eslintConfig } from '@zzjtnb/eslint-config'
import { zzjtnb as stylelintConfig } from '@zzjtnb/stylelint-config'
import markdownConfig from '@zzjtnb/markdownlint-config/config'

// 使用包公开类型，避免从 src 或未导出的 dist 子路径读取类型。
const options: ESLintConfigOptions = { rules: { 'no-console': 'error' } }
const styles: Config = stylelintConfig({ rules: { 'no-empty-source': true } })
console.log(await eslintConfig(options), styles, markdownConfig.ignores)
```

```jsonc [tsconfig.json]
{
  // 用 Node 的 ESM 包解析模式验证发布声明。
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    // 验证类型，不生成额外 JS。
    "noEmit": true,
    // 开启严格检查，验证公开 API 的类型约束。
    "strict": true,
    // 只加载该消费测试需要的 Node 全局类型。
    "types": ["node"],
  },
  // 仅检查本消费用例，不借用源码项目的 tsconfig。
  "include": ["consumer-types.ts"],
}
```

```bash
# 在消费项目自己的编译器和依赖环境中检查声明入口。
pnpm --config.verifyDepsBeforeRun=error --dir "$CONSUMER" exec tsc --noEmit
```

本文的 ESLint 和 Stylelint 配置使用 `.js` ESM。配置无法加载时先检查项目的 `"type": "module"`、实际文件名、公开导出和运行时版本，不为这些示例安装 TS 配置加载器。

通用双格式库若承诺 CommonJS，还要增加 `require` 消费用例；本项目不承诺 CJS，不把 ESM 配置包能否被 `require` 当作另一条发布契约。Markdownlint 根入口应交给原生配置解析器，不能对 JSONC 直接 `JSON.parse` 或作为 JS 执行。

## 发布 dry-run 与本地注册表 {#registry}

### dry-run 的范围

```bash
# 预演 ESLint 包发布，包含该包的发布前生命周期，但不上传 npm。
pnpm --dir "$ESLINT_DIR" publish --dry-run --access public --registry "$NPM_REGISTRY"
# 单独预演 Stylelint，核对它自己的文件与生命周期。
pnpm --dir "$STYLELINT_DIR" publish --dry-run --access public --registry "$NPM_REGISTRY"
# 单独预演 Markdownlint，不能省掉 /config 构建产物。
pnpm --dir "$MARKDOWNLINT_DIR" publish --dry-run --access public --registry "$NPM_REGISTRY"
```

dry-run 不上传，但可能构建、写入本地文件，仍可能受 Git 发布分支、工作区状态、认证或安装策略影响。不能据此确认真实发布权限、OTP、标签、注册表可见性或消费方安装成功。普通源码发布应遵循项目发布流程，不为了 dry-run 无条件跳过检查。

### Verdaccio：隔离的 publish → install → run

需要测试完整注册表行为时，可启动仅监听本机的 Verdaccio。以下会真正写入**本地**注册表，不向 npm 官方源发布；不要把本节发布命令中的注册表替换成官方源后当作调试操作。

```bash
# 创建本地注册表用途目录，保留其他轮次的数据。
mkdir -p "$LINT_REPO/.tmp/local-consumer/registry"
# 在用途目录内隔离此次验证注册表数据。
REGISTRY_DIR="$(mktemp -d "$LINT_REPO/.tmp/local-consumer/registry/XXXXXX")"
# 配置文件放在本次注册表目录中。
REGISTRY_CONFIG="$REGISTRY_DIR/config.yaml"
# 保存仅用于本地验证的注册地址。
LOCAL_REGISTRY="http://127.0.0.1:4873"
# 为此次验证注册表单独保存客户端认证，不改写原有 npm 凭据文件。
REGISTRY_AUTH="$REGISTRY_DIR/client.npmrc"
```

将下面配置保存到 `$REGISTRY_CONFIG`。配置和存储目录应位于新建的临时目录，不覆盖已有注册表：

```yaml [config.yaml（本地 Verdaccio）]
# 此次验证注册表的包存储位置，相对于配置文件。
storage: ./storage
# 此次验证登录用户文件，不提交或展示其中的密码哈希。
auth:
  htpasswd:
    file: ./htpasswd
# 第三方引擎等依赖仍通过官方注册表代理。
uplinks:
  npmjs:
    url: https://registry.npmjs.org/
# 本项目 scope 不代理到线上，避免误装已有正式版本。
packages:
  '@zzjtnb/*':
    # 本地包允许读取；发布需登录本次注册表。
    access: $all
    publish: $authenticated
    unpublish: $authenticated
  '**':
    # 其他依赖只需要下载代理，不赋予发布权限。
    access: $all
    proxy: npmjs
```

```bash
# 在单独终端启动此次验证注册表；首次 dlx 需要下载 Verdaccio。
pnpm dlx verdaccio --config "$REGISTRY_CONFIG" --listen 127.0.0.1:4873
```

服务终端只负责运行 Verdaccio。下面的登录和发布命令在保留了 PACK_DIR、REGISTRY_AUTH 等变量的操作终端执行；若是新终端，先重新设置这些变量。按当前 Verdaccio 认证方式创建本地用户，客户端凭据只写入此次验证文件：

```bash
# 向本机注册表登录；创建账户的提示取决于该 Verdaccio 版本及认证插件。
pnpm --npmrc-auth-file "$REGISTRY_AUTH" login --registry "$LOCAL_REGISTRY"
# 确认登录查询针对本地 registry。
pnpm --npmrc-auth-file "$REGISTRY_AUTH" whoami --registry "$LOCAL_REGISTRY"
# 向本机注册表发布前面生成的 ESLint tarball；local 标签不影响线上标签。
pnpm --npmrc-auth-file "$REGISTRY_AUTH" --dir "$PACK_DIR" publish "$ESLINT_TARBALL" --registry "$LOCAL_REGISTRY" --tag local --access public --no-git-checks
# 同样发布 Stylelint 产物。
pnpm --npmrc-auth-file "$REGISTRY_AUTH" --dir "$PACK_DIR" publish "$STYLELINT_TARBALL" --registry "$LOCAL_REGISTRY" --tag local --access public --no-git-checks
# 同样发布 Markdownlint 产物。
pnpm --npmrc-auth-file "$REGISTRY_AUTH" --dir "$PACK_DIR" publish "$MARKDOWNLINT_TARBALL" --registry "$LOCAL_REGISTRY" --tag local --access public --no-git-checks
```

`--no-git-checks` 用于这个独立打包目录的本地注册表演练，正式发布继续遵循项目的 Git 检查要求。新注册表可接收同一份产物版本；重复发布已有版本可能失败，下一轮应新建注册表数据目录，不能将覆盖线上既有版本当作解决方案。

如果所用 pnpm 的登录流程无法完成 Verdaccio 用户名密码认证，可以仅在本地登录这一步使用 npm 的 legacy 登录；其余打包、安装和运行仍使用 pnpm：

```bash
# 使用此次验证独立凭据文件完成本机用户名密码登录，不写入默认用户认证配置。
npm --userconfig "$REGISTRY_AUTH" login --registry "$LOCAL_REGISTRY" --auth-type=legacy
```

三个包目前没有相互运行时依赖，分别上传即可。如果验证其他相互依赖的工作区包，先核对 tarball 中已经转换的包间版本，再按依赖顺序发布所需包。只选择明确要验证的包，不对整个仓库无筛选执行 `pnpm -r publish`。

### 从本地注册表安装验证

```bash
# 从此次验证 ESLint tarball 的实际清单读取版本。
ESLINT_VERSION="$(tar -xOf "$ESLINT_TARBALL" package/package.json | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).version')"
# 从 Stylelint tarball 读取它自己的版本。
STYLELINT_VERSION="$(tar -xOf "$STYLELINT_TARBALL" package/package.json | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).version')"
# 从 Markdownlint tarball 读取它自己的版本。
MARKDOWNLINT_VERSION="$(tar -xOf "$MARKDOWNLINT_TARBALL" package/package.json | node -p 'JSON.parse(require("node:fs").readFileSync(0, "utf8")).version')"
# 创建注册表安装验证的用途目录。
mkdir -p "$CHECK_ROOT/registry"
# 使用新的注册表消费项目，不复用 link 或 tarball 项目。
REGISTRY_APP="$(mktemp -d "$CHECK_ROOT/registry/XXXXXX")"
# 初始化独立项目。
pnpm --dir "$REGISTRY_APP" init --init-type module
# 仅为这个新项目显式指定本项目 scope 的本地注册表，避免继承用户线上 scope 配置。
printf '%s\n' "@zzjtnb:registry=$LOCAL_REGISTRY" > "$REGISTRY_APP/.npmrc"
# 从本机注册表安装三个指定版本，其他引擎由本机注册表代理。
pnpm --dir "$REGISTRY_APP" add -D "@zzjtnb/eslint-config@$ESLINT_VERSION" "@zzjtnb/stylelint-config@$STYLELINT_VERSION" "@zzjtnb/markdownlint-config@$MARKDOWNLINT_VERSION" 'eslint@^10.13.0' 'stylelint@^17.16.0' 'markdownlint-cli2@^0.24.0' --registry "$LOCAL_REGISTRY"
# 确认实际安装版本和 registry 后，重复三工具配置与验证真实工具验证。
pnpm --dir "$REGISTRY_APP" list --depth 0
```

新发布版本可能被消费项目的 `minimumReleaseAge` 或信任策略阻止。如果确定是本地注册表的此次验证测试版本，在**这个新建验证项目**中声明精确包名及版本的例外，不修改真实业务项目的全局策略：

```yaml [pnpm-workspace.yaml（隔离验证项目）]
# 示例版本需替换为此次验证实际测试版本；只豁免所列包，不放开所有新依赖。
minimumReleaseAgeExclude:
  - '@zzjtnb/eslint-config@1.0.5'
  - '@zzjtnb/stylelint-config@1.0.5'
  - '@zzjtnb/markdownlint-config@1.0.5'
```

该例外只写入此次验证 REGISTRY_APP 的配置，按实际测试版本填写，再重试该项目的安装。完整性变化、信任降级和脚本审批分别按具体错误处理。验证完成后停止本次 Verdaccio，保留所需测试数据。

## 发布后从 npm 安装精确版本 {#published}

本节用于核验已经发布的版本，不执行正式发布。三个版本分别选择，不直接把本地清单版本当成已发布事实：

```bash
# 查询 ESLint 的可用版本、标签、入口、运行环境和依赖信息。
pnpm view @zzjtnb/eslint-config versions dist-tags exports engines dependencies peerDependencies dist --json --registry "$NPM_REGISTRY"
# 查询 Stylelint 的独立发布状态。
pnpm view @zzjtnb/stylelint-config versions dist-tags exports engines dependencies peerDependencies dist --json --registry "$NPM_REGISTRY"
# 查询 Markdownlint 根规则与扫描入口的发布清单。
pnpm view @zzjtnb/markdownlint-config versions dist-tags exports dependencies dist --json --registry "$NPM_REGISTRY"
# 替换为上一条查询中确实存在的目标版本，不能仅凭示例版本安装。
ESLINT_VERSION="1.0.5"
# 单独选择 Stylelint 的目标版本。
STYLELINT_VERSION="1.0.5"
# 单独选择 Markdownlint 的目标版本。
MARKDOWNLINT_VERSION="1.0.5"
# 创建正式发布版本的消费验证用途目录。
mkdir -p "$CHECK_ROOT/published"
# 在用途目录内创建此次验证独立项目。
PUBLISHED_APP="$(mktemp -d "$CHECK_ROOT/published/XXXXXX")"
# 初始化项目，不继承本地工作区依赖。
pnpm --dir "$PUBLISHED_APP" init --init-type module
# 只为此次验证验证项目明确配置 npm 官方 scope 解析，不写入认证令牌。
printf '%s\n' "@zzjtnb:registry=$NPM_REGISTRY" > "$PUBLISHED_APP/.npmrc"
# 从注册表安装精确版本和工具，不使用 workspace、link、file 或本地 tgz。
pnpm --dir "$PUBLISHED_APP" add -D --save-exact "@zzjtnb/eslint-config@$ESLINT_VERSION" "@zzjtnb/stylelint-config@$STYLELINT_VERSION" "@zzjtnb/markdownlint-config@$MARKDOWNLINT_VERSION" 'eslint@^10.13.0' 'stylelint@^17.16.0' 'markdownlint-cli2@^0.24.0' --registry "$NPM_REGISTRY"
# 检查实际安装的版本和包来源。
pnpm --dir "$PUBLISHED_APP" list --depth 0
# 检查当前消费组合的 peer 兼容性。
pnpm --config.verifyDepsBeforeRun=error --dir "$PUBLISHED_APP" peers check
```

然后将[三工具配置与验证](#tool-checks)的真实配置和正负输入用于 `$PUBLISHED_APP`，重复入口加载、规则覆盖、检查、修复及类型验证。查询到版本不等于安装成功，安装成功也不等于该工具已按配置实际检查文件。

### dlx 验证已发布的 CLI

三个配置包没有 bin，不能直接 dlx 它们；可以在注册表版本消费项目内用 `pnpm exec` 验证工具加载这些配置。需要验证某个已发布 CLI 自身的临时执行体验时，显式指定工具包和版本，例如 CLI2：

```bash
# 切换到新建的注册表消费项目，让 CLI2 使用该项目的配置和文件。
cd "$PUBLISHED_APP"
# 临时安装指定 CLI2 版本并调用它自己的 bin，不把配置包名当成命令名。
pnpm --registry "$NPM_REGISTRY" dlx --package=markdownlint-cli2@0.24.0 markdownlint-cli2 --help
```

dlx 的临时环境可能与项目已有 peer、插件和配置加载器不同，因此不能用 dlx 通过替代前面的直接依赖安装测试。需要覆盖多个 Node.js、平台或 peer 主版本时，应建立对应测试矩阵，分别安装并执行，不能用当前机器的一次通过推断全部兼容范围。

## CLI 执行与断点调试 {#cli-debug}

### 区分配置包与真正的 CLI 包

三个配置包通过引擎命令运行。下面从业务项目调用已安装工具，再沿工具加载配置的过程设置断点：

```bash
# 显示消费项目安装的 ESLint CLI 帮助，不临时下载另一个版本。
pnpm --dir "$APP_REPO" exec eslint --help
# 确认实际运行的 Stylelint 版本。
pnpm --dir "$APP_REPO" exec stylelint --version
# 显示消费项目所装 CLI2 的命令帮助。
pnpm --dir "$APP_REPO" exec markdownlint-cli2 --help
```

对自己开发的 CLI，必须检查 `package.json` 的 `bin` 映射。例如 ESLint 的命令名和入口映射形如：

```json [package.json（CLI 字段片段）]
{
  "bin": {
    "eslint": "./bin/eslint.js"
  }
}
```

`bin` 的键是安装后暴露的命令名，值是包内实际文件。入口通常以 `#!/usr/bin/env node` 开头；打包后该文件、shebang 和执行权限应保留。不要将这一段添加到三个配置包里。

### 用 Node Inspector 调试真实 ESLint 入口

先在业务项目解析其已安装的 ESLint，而不是硬编码 `.pnpm` 内部路径：

```bash
# 切换到消费项目，保证模块解析和用户文件相对路径都属于该项目。
cd "$APP_REPO"
# 从 ESLint 自己的公开 package.json 读取 bin，得到当前安装版本的入口。
ESLINT_CLI="$(node --input-type=module <<'NODE'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'

const require = createRequire(import.meta.url)
const manifestPath = require.resolve('eslint/package.json')
const manifest = require(manifestPath)
console.log(resolve(dirname(manifestPath), manifest.bin.eslint))
NODE
)"
# 直接执行同一入口，先排除 bin 包装器问题。
node "$ESLINT_CLI" "$TARGET_FILE"
# 在本机 9229 暂停启动，允许调试引擎进入共享配置工厂的调用过程。
node --inspect-brk=127.0.0.1:9229 --enable-source-maps "$ESLINT_CLI" "$TARGET_FILE"
```

连接终端输出的 Inspector 地址：可以在 VS Code 使用“附加到 Node.js 进程”，或从 Chrome DevTools 的 Node 调试入口连接，然后设置断点并继续。Node Inspector 是调试协议，前面的 ESLint Config Inspector 是配置可视化工具，两者用途不同。

也可以把下面文件合并到**消费项目**的 VS Code 配置；工作区根即该业务项目：

```jsonc [.vscode/launch.json]
{
  // VS Code 调试配置格式版本。
  "version": "0.2.0",
  // 可从调试面板选择的启动方案。
  "configurations": [
    {
      // 使用内置 Node.js 调试器启动实际 CLI。
      "type": "node",
      "request": "launch",
      "name": "调试 ESLint 与本地配置",
      // 使用项目安装命令，保持 pnpm 的本地 bin 解析。
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["exec", "eslint"],
      // 替换为业务项目中存在的待检查文件；默认不修复。
      "args": ["src/local-check.ts"],
      // 用户输入和配置搜索都以消费项目为基准。
      "cwd": "${workspaceFolder}",
      // 在集成终端显示工具输出及交互。
      "console": "integratedTerminal",
      // 启用已生成的 sourcemap，缺少 map 时可直接在 dist 下断点。
      "sourceMaps": true,
      // 进入子 Node 进程，避免只停留在 pnpm 包装层。
      "autoAttachChildProcesses": true,
      // 单步调试时跳过 Node 内部实现。
      "skipFiles": ["<node_internals>/**"],
    },
  ],
}
```

TypeScript 源码断点需要对应 sourcemap；没有 map 时可直接在 dist/index.mjs 设置断点。构建后重启被调试进程，停止调试时一并停止该次启动的子进程。

自己开发的 CLI 还应从 tarball 安装后验证 `pnpm exec 命令名 --help`、版本输出、真实子命令、失败退出码、标准输出/错误输出和模板等资源路径。直接运行源码或 bin 文件不能代替安装后的命令验证。

## npm 消费项目的对应操作 {#npm}

消费项目本来使用 npm 时，可以保持其包管理器，不要求为了联调改成 pnpm。以下是对应语义，选一种方式即可，不在同一个项目混写两套锁文件：

| pnpm 主流程 | npm 项目对应操作 |
| --- | --- |
| `add -D 包名@link:路径` | npm 没有相同 link: 协议，使用 npm link 或本地目录安装 |
| `link 包目录` | npm link 的全局注册与消费方链接流程 |
| `add -D 包目录` / `file:` | npm install -D 本地目录或 file: 声明 |
| `pack` / `pack --dry-run` | npm pack / npm pack --dry-run |
| `add -D 包.tgz` | npm install -D 包.tgz |
| `exec eslint` | npm exec -- eslint |
| `dlx --package=工具@版本 命令` | npm exec --package=工具@版本 -- 命令；npx 是 npm 的另一入口 |

本项目源码清单使用 pnpm catalog，npm 不负责解析它。npm 消费方优先安装前面经过 pnpm pack 转换的同一份 tarball：

```bash
# 切换到本来使用 npm 的消费项目，避免在 pnpm 项目里生成另一套锁文件。
cd "$APP_REPO"
# 安装经过发布转换的 ESLint tarball 和兼容引擎。
npm install -D "$ESLINT_TARBALL" 'eslint@^10.13.0'
# 调用消费项目已安装的 ESLint，验证包入口和真实输入。
npm exec -- eslint "$TARGET_FILE"
# 用 npm 的打包预览检查同一份归一化 tarball，不直接打包含 catalog: 的源码清单。
npm pack "$ESLINT_TARBALL" --dry-run
```

如果还要验证 npm 的两步全局链接机制，可以链接已经解包、依赖范围已转换的发布目录：

```bash
# 创建此次验证 npm link 解包用途目录。
mkdir -p "$PACK_DIR/npm-link"
# 隔离本次解包，不改写原 tarball 或本仓库源码。
NPM_LINK_DIR="$(mktemp -d "$PACK_DIR/npm-link/XXXXXX")"
# 解包后目录为 $NPM_LINK_DIR/package，包含普通注册表依赖范围。
tar -xf "$ESLINT_TARBALL" -C "$NPM_LINK_DIR"
# 进入已转换的包目录，不在含 catalog: 的源码目录运行 npm install。
cd "$NPM_LINK_DIR/package"
# 只安装发布运行所需依赖及 npm 按策略解析的 peer，不安装包开发依赖。
npm install --omit=dev
# 将该发布目录注册到 npm 的全局链接位置，不上传 registry。
npm link --omit=dev
# 返回 npm 消费项目。
cd "$APP_REPO"
# 使用该全局链接；--no-save 不将临时链接写成正式依赖声明。
npm link @zzjtnb/eslint-config --no-save
# 验证安装后的命令确实能加载该目录。
npm exec -- eslint "$TARGET_FILE"
```

此时链接的是解包产物，修改原 src 后要重新构建、打包并刷新测试目录；本项目源码的快速迭代仍优先使用 pnpm 的直接路径链接。对不含 pnpm 专用清单的普通 npm 包，可以从其包目录直接执行 npm link。全局 link 会留下机器级链接状态，恢复时同时核对消费项目和 npm 全局注册；不要假设它与现行 pnpm link 的作用范围相同。

## pnpm deploy 与应用部署边界 {#deploy}

`pnpm deploy` 用于导出工作区应用及其所需依赖。它不能代替三个配置包的 pack、注册表发布和消费测试。本项目的 `apps/demo` 是开发检查示例，配置包位于 devDependencies；不要以生产 deploy 后省略这些开发依赖为由判断配置包缺失。

需要导出这个示例来验证离线工作区布局时，可按当前 pnpm 的 deploy 条件执行；下面显式采用 legacy 模式，不为一次验证改动根工作区注入策略：

```bash
# 准备应用导出用途目录，保留已有部署产物。
mkdir -p "$LINT_REPO/.tmp/demo-deploy"
# 在用途目录内创建此次验证导出目录。
DEPLOY_PARENT="$(mktemp -d "$LINT_REPO/.tmp/demo-deploy/XXXXXX")"
# 示例的 lint 工具是开发依赖，因此这里不加 --prod。
pnpm --dir "$LINT_REPO" --filter @zzjtnb/lint-demo deploy --legacy "$DEPLOY_PARENT/demo"
# 从导出目录运行实际检查入口，确认其所需文件和依赖存在。
pnpm --dir "$DEPLOY_PARENT/demo" run lint
```

可部署应用只需运行时依赖时才使用 `--prod`。非 legacy deploy 的工作区注入条件、独立锁文件和支持行为以所用 pnpm 主版本为准；不要为了让库发布测试通过而全仓开启注入。多个相互依赖的 npm 包发布，仍应在本地注册表按依赖关系验证。

## 已发布包的源码联调与依赖补丁 {#patch}

如果问题出现在已发布版本，先用[发布后验证](#published)锁定包、引擎和输入，再判断要调试源码还是仅验证依赖补丁。

- 调试本项目源码：选择与目标发布版本对应的源码，在包仓库安装、构建，再把消费项目改为[本地链接](#local-link)的链接；不要用未知分支的最新源码解释旧版本行为。
- 修改包内 TypeScript 实现：修改 src 后构建公开产物，而不是直接改 dist 或 node_modules。
- 临时修补一个无法立即发布的依赖：使用 pnpm patch 生成显式补丁，补丁与依赖版本一起审查。

```bash
# 先核对消费项目的准确包版本，下面以查询后的实际版本替换变量。
pnpm --dir "$APP_REPO" list @zzjtnb/eslint-config --depth 0
# 指定要诊断的发布版本，不默认使用 latest。
PATCH_VERSION="1.0.5"
# 在业务项目自己的临时目录准备可编辑的解包位置。
mkdir -p "$APP_REPO/.tmp/package-patch"
# 提取指定依赖到可编辑目录，不直接修改 node_modules。
pnpm --dir "$APP_REPO" patch "@zzjtnb/eslint-config@$PATCH_VERSION" --edit-dir "$APP_REPO/.tmp/package-patch/eslint-config"
# 完成有依据的修改后，生成并登记补丁；它会改变项目的补丁文件及配置。
pnpm --dir "$APP_REPO" patch-commit "$APP_REPO/.tmp/package-patch/eslint-config"
```

patch 用于显式维护消费方的临时差异，不是修复本项目源码的替代方案。修复进入正式版本后，按 pnpm 的补丁移除流程恢复对应版本并重新验证，不手动编辑 node_modules 伪造结果。

## 排查没有生效、安装失败与缓存 {#troubleshooting}

### 先确认包和文件确实被使用

```bash
# 查看三个包实际来自本地目录、tarball 还是注册表版本。
pnpm --dir "$APP_REPO" list @zzjtnb/eslint-config @zzjtnb/stylelint-config @zzjtnb/markdownlint-config --depth 0
# 追踪某个配置包为何被安装以及被哪些直接依赖引用。
pnpm --dir "$APP_REPO" why @zzjtnb/eslint-config
# 检查本地 ESLint 包目录及构建产物是否存在。
ls "$ESLINT_DIR/dist"
# 检查 Stylelint 的入口与声明。
ls "$STYLELINT_DIR/dist"
# Markdownlint 同时检查规则根入口和扫描配置产物。
ls "$MARKDOWNLINT_DIR/index.jsonc" "$MARKDOWNLINT_DIR/dist"
```

检查目标路径相对于消费项目是否正确、文件是否存在、是否被 Git 忽略或工具 ignore 排除。业务项目不属于本仓库时，不从本仓库根目录对它运行相对路径的 lint，再把结果当作消费项目的配置。

### 保存最终配置与诊断

```bash
# 为本次最终配置输出保留独立文件，不覆盖以前的诊断。
mkdir -p "$APP_REPO/.tmp/local-consumer/eslint-config"
# 在最终配置用途目录内创建此次验证诊断文件。
CONFIG_OUTPUT="$(mktemp "$APP_REPO/.tmp/local-consumer/eslint-config/XXXXXX")"
# 输出真实目标文件的最终规则，命令失败时保留退出状态和错误。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint --print-config "$TARGET_FILE" > "$CONFIG_OUTPUT"
# 独立打印记录路径，便于打开检查。
printf '%s\n' "$CONFIG_OUTPUT"
# 核对 Stylelint 目标文件最终 parser 与规则。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec stylelint --print-config "$STYLE_FILE" --config stylelint.config.js
# Markdownlint 直接用含目标违规内容的文件验证规则名、行列与覆盖效果。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec markdownlint-cli2 "$MARKDOWN_FILE"
```

不要只凭“能 import”“能解析 JSONC”或“错误数为零”判断规则生效。对于修复后的内容，还需再次检查最终文本，确认剩余诊断及行列对应最终文件。

### 依赖校验、peer 和安装策略

`ERR_PNPM_TRUST_DOWNGRADE`、完整性错误、发布时长限制、依赖不同步、peer 不兼容以及安装脚本未获准需要分别处理，不能统一靠删除锁文件或关闭信任策略解决。

```bash
# 核对当前 Node 与 pnpm 版本，保留在复现记录中。
node --version
# 查看当前命令实际使用的 pnpm 版本。
pnpm --version
# 检查现有安装的 peer，不因普通检查隐式安装依赖。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" peers check
# 如果报错明确指向 ESLint 引擎，通过依赖树核对其来源。
pnpm --dir "$APP_REPO" why eslint
# 仅在已核对并确认需要同步依赖时安装，不作为信任错误的通用修复。
pnpm --dir "$APP_REPO" install
# 仅当提示明确需要依赖构建审批时，交互批准已确认用途的依赖脚本。
pnpm --dir "$APP_REPO" approve-builds
# 恢复后重新运行最初失败的真实场景，而不只验证 install 退出成功。
pnpm --config.verifyDepsBeforeRun=error --dir "$APP_REPO" exec eslint "$TARGET_FILE"
```

检查报错中的具体包名、版本、registry、策略字段和清单/锁文件差异。安装生命周期审批可能修改配置；不要批量放开未知构建脚本。私有 registry 的认证继续由该消费项目及既有凭据配置负责，不向文档或日志复制令牌。

### Vite、编辑器与模块缓存

构建已经更新而 Vue/Vite 消费页面仍无变化时，先检查入口、符号链接目标和是否使用了旧 tarball，再处理预构建缓存。下面仅适用于真实消费项目本来就使用 Vite 的情况：

```bash
# 从消费项目直接启动其已安装 Vite 并强制重新预构建依赖。
pnpm --dir "$APP_REPO" exec vite --force
```

若 dev 脚本是 Vite，可按脚本参数规则传递 `--force`；不要把 Vite 参数传给 ESLint、Stylelint 或 CLI2。共享配置在 Node/扩展进程里加载时，应重启相应检查进程或重新加载编辑器扩展，页面刷新不会自动重启编辑器的 lint 服务。

| 现象 | 重点排查 |
| --- | --- |
| 修改 src 不生效 | exports 是否指向 dist、watch 是否完成、是否有另一轮构建覆盖产物 |
| 修改 file: 目录后没变化 | 硬链接/文件替换行为、消费安装是否需要更新、实际入口与实例路径 |
| link 能用，tarball 失败 | files、exports、漏发资源、缺失生产依赖、绝对源码路径 |
| Monorepo 能用，独立安装失败 | 父级依赖泄漏、workspace/catalog 转换、消费方 peer |
| 某个工具没有报错 | 是否匹配目标文件、是否被忽略、目标规则是否启用 |
| Markdownlint /config 加载失败 | dist 是否构建和发布、包内 index.jsonc 是否存在 |
| ESM 配置无法加载 | package.json 的 type、配置文件名、公开导出、Node 版本 |
| 类型声明无法解析 | 声明是否随包、exports 子路径、消费方解析模式及类型依赖 |
| Vue/React 实例重复 | peer 是否由消费方声明、两侧版本和链接解析位置 |
| node 入口能用，CLI 命令失败 | bin 路径、shebang、可执行权限、安装生成的命令包装器 |
| 本地 registry 装到线上版本 | scope registry、Verdaccio 的代理规则、精确版本与包来源 |
| 新版查询存在但安装失败 | dist-tag、注册表配置、安装策略、实际 tarball 可下载性 |

## 恢复依赖与结束联调 {#restore}

先区分本次采用的方式，再恢复业务项目。操作前核对原版本范围、依赖所在字段和 registry；下面的范围仅是填写格式示例，应换成联调前的记录。

| 本次操作 | 恢复方式 |
| --- | --- |
| 声明式 link、file 或 tarball | 重新安装原先的注册表版本范围；Stylelint 联调同时恢复引擎版本依赖 |
| 命令式 pnpm link | unlink 对应包，再核对工作区 overrides 和原依赖声明 |
| npm 全局 link | 解除业务项目链接与本次全局注册，再恢复原版本范围 |
| 临时新增的配置包 | 按需移除新增依赖，不给原来未安装的包添加正式版本 |
| 独立消费测试 | 原业务项目未被修改，无需恢复其依赖，只停止本次验证进程 |

```bash
# 填写消费项目联调前的实际 ESLint 配置版本范围，不自动升级到 latest。
ORIGINAL_ESLINT_RANGE="^1.0.5"
# 单独填写原 Stylelint 配置版本范围。
ORIGINAL_STYLELINT_RANGE="^1.0.5"
# 填写联调前的 Stylelint 引擎版本范围；示例值需按原清单调整。
ORIGINAL_STYLELINT_ENGINE_RANGE="^17.16.0"
# 单独填写原 Markdownlint 配置版本范围。
ORIGINAL_MARKDOWNLINT_RANGE="^1.0.5"
# 使用 pnpm link 命令创建过临时 override 时，先移除所选包的命令式链接。
pnpm --dir "$APP_REPO" unlink @zzjtnb/eslint-config
# 将 ESLint 配置恢复为原先注册表范围。
pnpm --dir "$APP_REPO" add -D "@zzjtnb/eslint-config@$ORIGINAL_ESLINT_RANGE" --registry "$NPM_REGISTRY"
# 同时恢复 Stylelint 配置与引擎的注册表依赖，移除两处本地 link。
pnpm --dir "$APP_REPO" add -D "stylelint@$ORIGINAL_STYLELINT_ENGINE_RANGE" "@zzjtnb/stylelint-config@$ORIGINAL_STYLELINT_RANGE" --registry "$NPM_REGISTRY"
# 将 Markdownlint 配置恢复为它原先的范围。
pnpm --dir "$APP_REPO" add -D "@zzjtnb/markdownlint-config@$ORIGINAL_MARKDOWNLINT_RANGE" --registry "$NPM_REGISTRY"
# 确认没有残留本地路径、旧 tarball 或非预期 overrides。
pnpm --dir "$APP_REPO" list @zzjtnb/eslint-config @zzjtnb/stylelint-config @zzjtnb/markdownlint-config --depth 0
# 审查恢复后的清单、锁文件、工作区设置和补丁差异，不覆盖其他已有改动。
git -C "$APP_REPO" diff
```

如果曾对 Stylelint、Markdownlint 使用命令式 pnpm link，也分别 unlink 它们。仅本次新增、之前未安装的依赖，可按实际归属移除：

```bash
# 仅当 ESLint 配置包是本次新增开发依赖、且现在不再需要时移除。
pnpm --dir "$APP_REPO" remove -D @zzjtnb/eslint-config
```

使用过本页 npm 全局链接示例时，执行对应的清理，而不是对 pnpm 项目执行 npm 命令：

```bash
# 进入本次使用 npm 的业务项目。
cd "$APP_REPO"
# 解除项目中的临时链接，不改写原依赖声明。
npm unlink @zzjtnb/eslint-config --no-save
# 解除本次自己创建的同名全局注册。
npm unlink --global @zzjtnb/eslint-config
# 根据之前记录的版本范围恢复项目依赖。
npm install -D "@zzjtnb/eslint-config@$ORIGINAL_ESLINT_RANGE"
```

原项目使用 dependencies 而非 devDependencies 时，恢复到原字段。最后审查清单、锁文件和工作区设置，只保留预期变化，不覆盖其他已有改动。

停止本次启动的 watch、CLI 调试器、消费服务和 Verdaccio；只处理自己启动的进程。临时 tarball、诊断和隔离项目可保留复现，确认不需要后按项目清理约定处理，不删除注册表正式版本或他人的认证配置。

### 验收顺序

1. 包内类型与测试通过，三个配置包按公开入口构建。
2. link/workspace 下，真实消费输入、目标规则和消费方覆盖得到验证。
3. pack 的文件与清单正确，单包及组合 tarball 在独立项目可安装和运行。
4. 公开 ESM 入口、Markdownlint JSONC 与 /config、声明、引擎命令和修复行为符合契约。
5. 需要验证完整发布时，在本地注册表重复上传、安装和运行；应用 deploy 另行验证。
6. 正式发布后，从目标 registry 的精确版本重新安装并运行；按承诺范围覆盖 Node、peer 和平台。
7. 恢复真实消费项目的依赖范围，关闭本次进程，保留必要证据。

## 官方参考

- [pnpm link、unlink 与 file: 的差异](https://pnpm.io/cli/link)
- [pnpm unlink](https://pnpm.io/cli/unlink)
- [pnpm 本地目录与 tarball 安装](https://pnpm.io/cli/add)
- [pnpm workspace 协议及发布转换](https://pnpm.io/workspaces)
- [pnpm 工作区筛选](https://pnpm.io/filtering)
- [pnpm pack](https://pnpm.io/cli/pack)
- [pnpm publish](https://pnpm.io/cli/publish)
- [pnpm exec](https://pnpm.io/cli/exec)
- [pnpm dlx](https://pnpm.io/cli/dlx)
- [pnpm deploy](https://pnpm.io/cli/deploy)
- [pnpm patch](https://pnpm.io/cli/patch)
- [pnpm 安装与供应链策略](https://pnpm.io/settings/dependency-resolution)
- [npm package.json：files、exports 与 bin](https://docs.npmjs.com/cli/v11/configuring-npm/package-json)
- [npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack)
- [npm link](https://docs.npmjs.com/cli/v11/commands/npm-link)
- [npm 生命周期](https://docs.npmjs.com/cli/v11/using-npm/scripts)
- [Verdaccio 配置](https://verdaccio.org/docs/configuration/)
- [Node.js 断点调试](https://nodejs.org/api/debugger.html)
