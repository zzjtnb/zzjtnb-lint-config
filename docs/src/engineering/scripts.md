---
navigation:
  # 工程与维护中的导航名称。
  text: 项目脚本
  # 与依赖管理、联调和 Monorepo 属于同一组。
  group: engineering
  # 位于 Monorepo 教程之后。
  order: 40
---

# package.json 脚本规范

本文说明 package.json 的 scripts 命名、执行行为与排列顺序，覆盖根工程、应用和配置包。工作区与任务图的搭建见 [Monorepo](/monorepo)。只声明实际提供的能力，不为排列整齐添加空脚本；下方通用模板包含可选功能，不代表本仓库全部启用。

## 1. 命名与职责

| 名称 | 应用命令 | 根工程命令 | 用途与条件 |
| --- | --- | --- | --- |
| `dev` | Vue:`vite`;Nest:`nest start --watch`;Node:`tsdown --watch` | `turbo run dev --continue=dependencies-successful` | 启动开发服务或监听构建;独立任务可继续,依赖失败的任务不启动 |
| `dev:debug` | `nest start --debug --watch` | `turbo run dev:debug` | 开发调试,筛选单个服务 |
| `start` | `node dist/main.js` | `turbo run start` | 运行已构建的服务进程,启动前显式构建 |
| `build` | Vue:`run-p typecheck "build-only {@}" --`;Nest:`nest build`;Node:`tsdown` | `turbo run build` | 完整构建;Vue 同时执行类型检查 |
| `build-only` | `vite build` | `turbo run build-only` | 纯构建;需要时注册 Turbo 同名任务 |
| `preview` | `vite preview` | `turbo run preview` | 预览已有构建产物 |
| `typecheck` | Vue:`vue-tsc --build`;Node / Nest:`tsc --noEmit` | `turbo run typecheck` | 不输出应用构建产物的类型检查 |
| `test:e2e` | Vue:`playwright test`;Nest:`vitest run --config ./vitest.config.e2e.ts` | `turbo run test:e2e` | 端到端测试,先构建目标应用 |
| `test:cov` | `vitest run --coverage` | `turbo run test:cov` | 单次测试并生成覆盖率报告,需要覆盖率提供器 |
| `test:debug` | `vitest --inspect-brk --no-file-parallelism` | `turbo run test:debug` | 等待调试器连接后运行,筛选单个应用 |
| `test:run` | `vitest run` | `turbo run test:run` | 明确单次执行并返回真实退出状态 |
| `test:ui` | `vitest --ui` | `turbo run test:ui` | 启动 Vitest UI,需要 @vitest/ui;建议筛选单个应用 |
| `test` | `vitest` | `turbo run test` | 默认交互测试模式;CI 中工具自动单次执行 |
| `preinstall` | 不在应用重复声明 | `node ./scripts/preinstall/index.js` | 根依赖安装前检查包管理器 |
| `postinstall` | 工作区声明自身 `build` | `pnpm -r run --if-present build` | 安装后按工作区依赖顺序运行实际存在的构建 |
| `clean` | 不在应用重复声明 | `node ./scripts/clean/index.js` | 按清理脚本将依赖,产物及锁文件回收 |
| `lint:eslint` | 使用根检查入口 | `eslint . --config eslint.config.js --cache --cache-location node_modules/.cache/.eslintcache` | 检查 JS,TS,Vue 与受支持的配置文件 |
| `lint:stylelint` | 使用根检查入口 | `stylelint "**/*.{css,scss,vue,html,htm}" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache` | 检查样式文件及容器内样式 |
| `lint:markdownlint` | 使用根检查入口 | `markdownlint-cli2 --config .markdownlint-cli2.mjs "**/*.md"` | 检查 Markdown |
| `lint` | 使用根检查入口 | 顺序:`pnpm run lint:eslint && pnpm run lint:stylelint && pnpm run lint:markdownlint`;Turbo:`turbo run //#lint:eslint //#lint:stylelint //#lint:markdownlint` | 顺序串联或任务图调度,按下方模板选择 |
| `format:eslint` | 使用根修复入口 | `pnpm run lint:eslint --fix` | 自动修复 ESLint 支持的问题 |
| `format:stylelint` | 使用根修复入口 | `pnpm run lint:stylelint --fix` | 自动修复 Stylelint 支持的问题 |
| `format:markdownlint` | 使用根修复入口 | `pnpm run lint:markdownlint --fix` | 自动修复 Markdownlint 支持的问题 |
| `format` | 使用根修复入口 | `pnpm run format:eslint && pnpm run format:stylelint && pnpm run format:markdownlint` | 按顺序修复,失败立即停止 |
| `release` | 配置包使用 `bumpp` | `node scripts/release/index.js` | 配置包入口维护版本；根入口执行交互发布流程，二者职责不同 |
| `prepublishOnly` | `pnpm run build` | 不在私有根工程声明 | 发布前构建;不能作为发布授权 |

表中的根命令给出同名脚本的标准写法;start,build-only,覆盖率和调试等可选入口须先在 Turbo 注册对应任务,才加入根清单.应用列的"使用根入口"表示复用表中右侧命令,不在应用重复安装或维护一套工具.

开发服务统一用 dev,开发调试用 dev:debug,运行服务构建产物用 start,不重复提供 start:dev,start:debug,start:prod.前端 preview 是 Vite 产物预览服务,不作为生产服务启动命令.

类型检查统一使用 `typecheck`。Vitest 项目一般使用 `test: vitest`，需要单次运行时追加 `--run`；仅在项目确有独立使用需求时提供 `test:run`。Vue 脚手架已有的 `test:unit` 保留，Playwright 使用 `test:e2e`；独立 Node.js 脚本使用 `node --test`。不为统一命名而替换实际测试运行器或添加同义转发入口。

`test:e2e` 与 `test` 的测试发现范围应独立配置,单元测试不能误扫描端到端文件.保留 `test:cov`,`test:debug` 等真实扩展能力时,其行为由具体测试工具决定.

## 2. 排列顺序

存在对应命令时按以下顺序排列;缺少某项则跳过,不添加占位命令:

1. 启动与开发:`dev`,`dev:debug` 及其他 `dev:*`,`start`.两系列同级,集中放在最前面；已有的 predev 钩子紧邻 dev。
2. 构建:`build`,`build-only` 及其他 `build:*`.
3. 预览:`preview`.
4. 类型检查:`typecheck`.
5. 测试:`test:e2e`,`test:cov`,`test:debug`,`test:run`,`test:ui`、脚手架已有的 `test:unit`、`test`.
6. 其余安装钩子、清理、资源生成、检查、格式化和发布命令，相关子命令集中排列。lint 子命令后放 lint 汇总和其他 lint 扩展，再放 format 子命令与汇总，最后放发布入口。

### 2.1 根工程脚本模板

根工程通过 Turbo 调度同名任务,下面是开发、构建、预览、类型检查与测试的完整命名模板.安装钩子,检查,格式化等其他入口接在这些命令之后.

```json
{
  "scripts": {
    "dev": "turbo run dev --continue=dependencies-successful",
    "dev:debug": "turbo run dev:debug",
    "start": "turbo run start",
    "build": "turbo run build",
    "preview": "turbo run preview",
    "typecheck": "turbo run typecheck",
    "test:e2e": "turbo run test:e2e",
    "test:cov": "turbo run test:cov",
    "test:debug": "turbo run test:debug",
    "test:run": "turbo run test:run",
    "test:ui": "turbo run test:ui",
    "test": "turbo run test",
    "preinstall": "node ./scripts/preinstall/index.js",
    "postinstall": "pnpm -r run --if-present build",
    "clean": "node ./scripts/clean/index.js",
    "lint:eslint": "eslint . --config eslint.config.js --cache --cache-location node_modules/.cache/.eslintcache",
    "lint:stylelint": "stylelint \"**/*.{css,scss,vue,html,htm}\" --config stylelint.config.js --cache --cache-location node_modules/.cache/.stylelintcache",
    "lint:markdownlint": "markdownlint-cli2 --config .markdownlint-cli2.mjs \"**/*.md\"",
    "lint": "pnpm run lint:eslint && pnpm run lint:stylelint && pnpm run lint:markdownlint",
    "format:eslint": "pnpm run lint:eslint --fix",
    "format:stylelint": "pnpm run lint:stylelint --fix",
    "format:markdownlint": "pnpm run lint:markdownlint --fix",
    "format": "pnpm run format:eslint && pnpm run format:stylelint && pnpm run format:markdownlint"
  }
}
```

模板列出可选能力的标准写法,不表示当前根清单已经全部启用。实际命令以各项目清单为准；本仓库根 test 汇总工作区测试，postinstall 只构建三个公开配置包，不构建所有应用。增加 test:cov 或 test:debug 根入口时,必须同时注册 Turbo 任务,并确保目标应用具备同名脚本,不能只复制调度命令.

### 根命令组合与参数

上方完整模板使用顺序串联的 lint,任何一项失败即停止;format 同样顺序执行三个修复命令.检查与修复命令复用同一配置,扫描范围和缓存参数,不能分别维护两套互相漂移的调用.

本仓库的 lint 采用 Turbo 调度根检查任务,对应写法如下;它与顺序串联是两种执行策略,选择一种作为实际 lint 入口,不重复运行两套:

```json
{
  "scripts": {
    "lint": "turbo run //#lint:eslint //#lint:stylelint //#lint:markdownlint",
    "format": "pnpm run format:eslint && pnpm run format:stylelint && pnpm run format:markdownlint"
  }
}
```

Turbo 形式要求在 turbo.jsonc 注册同名根任务,并设置 cache: false;顺序串联形式只要求各子脚本存在.format 保持顺序执行,避免多个工具同时写同一文件.

| 参数或写法 | 完整命令示例 | 行为 |
| --- | --- | --- |
| 继续独立开发任务 | `turbo run dev --continue=dependencies-successful` | 某任务失败后,继续没有失败依赖的任务;不把失败视为成功 |
| 筛选单个应用 | `pnpm dev --filter=@zzjtnb/playground` | 参数传给 Turbo,只运行目标应用的 dev 任务 |
| 调试单个服务 | `pnpm --filter @example/gateway run dev:debug` | 避免多个调试进程占用相同端口 |
| 筛选监听测试 | `pnpm --filter @zzjtnb/docs run test` | 只监听所选应用测试 |
| 为检查命令启用修复 | `pnpm run lint:eslint --fix` | --fix 传给 ESLint;其他检查工具按相同模式使用自身参数 |
| 给应用工具传参 | `pnpm --filter @zzjtnb/playground run test:e2e --project=chromium` | 直接调用应用脚本,浏览器选择参数传给 Playwright |
| 构建参数转发 | `run-p typecheck "build-only {@}" --` | npm-run-all2 占位符将传入参数转交给 build-only,不改变类型检查命令 |

参数属于接收它的工具.根 Turbo 命令的 --filter 用于工作区筛选;工具参数优先直接调用应用脚本,不能假定所有工作区支持同一组参数.新增参数前按当前工具版本核对其行为.

### 2.2 Vue 应用脚本模板

适用于 Vite + Vue,Vitest 和 Playwright.完整构建并行执行类型检查与纯构建;覆盖率和调试命令放在 test 前面.

```json
{
  "scripts": {
    "dev": "vite",
    "build": "run-p typecheck \"build-only {@}\" --",
    "build-only": "vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc --build",
    "test:e2e": "playwright test",
    "test:cov": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --no-file-parallelism",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test": "vitest"
  }
}
```

### 2.3 NestJS 应用脚本模板

适用于 Nest CLI + Vitest,端到端测试通过独立 Vitest 配置选择 HTTP 测试范围.

```json
{
  "scripts": {
    "dev": "nest start --watch",
    "dev:debug": "nest start --debug --watch",
    "start": "node dist/main.js",
    "build": "nest build",
    "typecheck": "tsc --noEmit",
    "test:e2e": "vitest run --config ./vitest.config.e2e.ts",
    "test:cov": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --no-file-parallelism",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test": "vitest"
  }
}
```

### 2.4 Node.js 应用或包脚本模板

适用于 tsdown + Vitest.没有独立端到端测试时不添加 test:e2e;dev 只监听构建,进程启动方式由应用另行定义.

```json
{
  "scripts": {
    "dev": "tsdown --watch",
    "build": "tsdown",
    "typecheck": "tsc --noEmit",
    "test:cov": "vitest run --coverage",
    "test:debug": "vitest --inspect-brk --no-file-parallelism",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test": "vitest"
  }
}
```

### 2.5 配套条件

三个应用启用 test:ui 时,均须直接声明 @vitest/ui,版本通过根 catalog 与 Vitest 对齐.

- Vue 完整构建示例需要 npm-run-all2 提供 run-p,其依赖版本通过根 catalog 管理.
- test:cov 需要实际覆盖率提供器;使用默认 V8 提供器时声明 @vitest/coverage-v8,版本与 Vitest 对齐.输出目录与报告格式由应用的 Vitest 配置管理.
- test:debug 使用 Node Inspector.--inspect-brk 在执行前暂停,--no-file-parallelism 避免多个测试文件同时占用调试端口;需要调试器连接,不适合无人值守 CI.
- test 使用 Vitest 默认交互模式;test:ui 提供可视化界面;test:run 显式单次执行.调试脚本与监听脚本不能作为 CI 的通过依据.

`build` 与 `build-only` 必须相邻,不将纯构建命令放到测试或类型检查之后.脚本排序只改变可读性,不改变命令语义.

## 3. Turbo 执行关系

根工程负责调度,工作区负责具体实现.Turbo 按同名脚本发现任务,根命令退出成功但未发现任务不能算检查通过.新增工作区时同时核对任务图和该工作区的脚本.

- `build` 根据工作区依赖关系运行前置构建,并缓存实际产物.
- `typecheck`,`test:run` 为可结束的检查任务;构建依赖和缓存按实际消费者配置.
- 通过 Turbo 调度交互测试时，`test`、`test:ui` 可设为 `persistent: true`、`cache: false`。单次执行使用已有脚本追加 `--run` 或确已提供的 `test:run`；本仓库根 test 直接汇总工作区，不注册 Turbo 测试任务。
- 启用 `test:cov` 时配置 coverage/** 输出,确保缓存命中能恢复报告;启用 `test:debug` 时设置 persistent: true,cache: false,并筛选单个应用.
- `test:e2e` 先完成当前应用构建,设置 `cache: false`,每次实际验证 HTTP 或浏览器行为.
- start 运行已有构建产物,不隐式构建;start,dev:debug 设置 persistent: true,cache: false.
- `dev` 是常驻任务,设置 `persistent: true`,`cache: false`.

任务字段的完整内容以根 turbo.jsonc 及创建模板为准;修改前查阅已安装 Turbo 包随附的版本文档.

## 4. 使用与验收

在本仓库根目录按需执行；浏览器测试会启动本地预览服务：

```sh
# 自动修复代码、样式与 Markdown，会写回文件。
pnpm run format
# 只检查三个工具的规则，不自动修改文件。
pnpm run lint
# 汇总各工作区的类型检查。
pnpm run typecheck
# 在 CI 模式下单次执行根入口已注册的全部测试。
CI=1 pnpm run test
# 构建公开包、文档站和 Playground。
pnpm run build
# 使用已构建的 Playground 产物执行 Chromium 端到端测试。
CI=1 pnpm --filter @zzjtnb/playground run test:e2e --project=chromium
```

浏览器端到端测试首次运行前执行 `pnpm --filter @zzjtnb/playground exec playwright install chromium`.CI 模式使用无头浏览器;本地交互测试保留应用自身配置.

需要监听某一个应用的测试时使用筛选:

```sh
# 只启动文档站的 Vitest 监听，不运行其他工作区测试。
pnpm --filter @zzjtnb/docs run test
```

验收核对执行了哪些工作区和测试,而不只看根命令退出状态.不得通过空脚本,允许空测试,跳过失败或把监听任务误作单次任务来制造通过结果.格式化不代替类型检查,测试或构建.

## 5. 修改与模板同步

修改命名或执行行为时,核对根清单,相关工作区清单,Turbo 任务,创建器输出,模板及应用 README 中的调用;同义旧入口在全部消费者更新后移除.版本范围由根 workspace catalog 管理,与脚本命名分开维护.

本文件维护脚本规范与可复制模板;当前实际启用哪些入口由各 package.json 和 turbo.jsonc 持有.搭建教程为独立重建工程而收录的完整文件内容,必须与对应创建源文件一致.
