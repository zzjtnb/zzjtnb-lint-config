# 工作台实现验证记录

日期：2026-10-25。范围为 `playground/` 及直接关联的工作区依赖、测试发现规则和使用文档。

## 实现范围

- [已验证] `App.vue` 仅承载路由出口；六个页面独立路由，使用 Hash 路由适配静态托管。公共导航归布局，配置与实验流程分别归 Pinia 领域。
- [已验证] 配置页为全宽配置序列，展开直接显示文件条件、忽略项、插件、语言与检查选项、处理器和逐条规则。静态元数据与实际沙箱解析共用配置描述转换。
- [已验证] Rules 保留搜索、插件、使用状态、声明级别、仅关闭、活动、推荐、可修复和废弃筛选；提供声明来源、原始参数、上游 Schema、级别覆盖和完整 JSON 编辑。
- [已验证] Files 支持沙箱示例与用户明确导入的目录/文件。列表与配置组合分组共用实际工作区结果，保留文件、匹配配置、Glob 和最终规则；不把未知来源链当成已知匹配。
- [已验证] Stats 支持工作区文件数、诊断数、执行器总时间、ESLint 正式解析/规则/修复/其他耗时，以及慢规则、慢插件、慢文件和慢任务。Stylelint、Markdownlint 不伪造未公开的逐规则统计。
- [已验证] CodeMirror 编辑源码和完整配置；真实引擎检查、修复差异预览和明确应用使用同一配置草稿。结果绑定工具、文件、源码、配置及工作区版本，旧结果不覆盖新输入。
- [已验证] 完整导出采用 ESM 语法定位默认导出，保留原始代码并追加工具对应的规则覆盖；未配置、继承和显式关闭分别处理。
- [已验证] UnoCSS 持有 reset、Docs 对齐字体和本地 Lucide 图标。公共编辑器与差异组件不访问业务 Store。

## 原始检查入口

```bash
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground run type-check
pnpm --config.verifyDepsBeforeRun=error exec eslint playground/src playground/sandbox playground/scripts playground/tests playground/playwright.config.ts --fix
pnpm --config.verifyDepsBeforeRun=error exec stylelint 'playground/src/**/*.vue' --fix
pnpm --config.verifyDepsBeforeRun=error exec vitest run playground/tests --project unit
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground run build
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground exec playwright test
```

[已验证] 当前源码测试为 7 个文件、26 项通过，涵盖真实引擎、元数据真实性、配置展示完整性、AND 文件条件与局部忽略、草稿隔离、源码导出、导入文件修改保留和过期修复保护。

[已验证] 完整构建包括真实元数据与固定依赖快照生成，通过包公开入口加载配置。构建后的页面从 `http://127.0.0.1:3001` 静态预览，响应携带 COOP/COEP；不存在检查业务 HTTP API。

[已验证] Playwright 使用本机已有 Chrome Beta，通过 `PLAYWRIGHT_EXECUTABLE_PATH` 指定可执行文件，未下载额外浏览器。最终 4 项端到端全部通过：页面与 390px 窄屏、三个工具真实检查与修复、文件分组与四种性能排行、规则修改与非法 JSON 保护及完整导出。浏览器执行总计约 3.9 分钟。

原始日志、截图与失败追踪保存在仓库 `.tmp/playground/validation/implementation/`，主要日志为 `build.log`、`browser-final.log`。此前失败没有作为通过证据：Markdownlint 默认导出的 await 表达式经兼容调整，ESLint 未命名配置字段改为省略，配置描述模块与 ConfigArray 显式纳入快照后分别重跑。

## 执行与部署边界

- [已验证] 固定依赖快照约 73 MiB，压缩分片每片不超过 8 MiB。首次下载、解压、挂载仍需要明显时间和内存；同一会话复用，不在线安装依赖。此处没有宣称已完成首屏性能优化。
- [已验证] ESLint 在当前 WebContainer 中需要针对 Promise 子类实例判断的检测式适配。保留规则和插件，未编辑第三方依赖文件；原始问题证据见 `方案.md`。
- [已验证] 60 秒限制作用于单次检查进程；共享依赖准备由运行时持有，用户取消当前等待不会破坏其他消费者。用户主动重启运行时会保留业务草稿。
- [已验证] 会话草稿未持久化到本机文件，刷新前应导出。示例源码只被分析，配置模块本身在浏览器 Node.js 沙箱执行。
- [已验证] 未发布至 Cloudflare，未验证 Safari、Firefox、手机真机或全部上游插件和类型感知项目；浏览器示例检查不等于消费项目全量验收。
- [已验证] 本次未执行提交、发布或清理其他任务进程。3001 预览服务保留用于查看产物，停止时应只停止本任务创建的服务。

## 方案对齐整改

本节以方案、完整设计稿及后续参考截图为共同基准，不以测试数量代替功能核对。之前的通过记录对应此前产物，不能视为下列整改已验收。

| 验收面 | 已发现差异 | 本轮整改与验收状态 |
| --- | --- | --- |
| 配置领域 | 级别转换在组件内，语言开关缺失 | [已验证] 转换归所属工具编辑模块；语言开关与动态表达式边界通过源码和浏览器验证 |
| 诊断归属 | 结果按工具保存而非文件，晚到错误可串写 | [已验证] 按工具与文件保存检查/修复，晚到失败与输入身份绑定，源码回归通过 |
| 性能归属 | 性能运行覆盖代码实验结果 | [已验证] 性能与单文件诊断独立持有，源码和工作区浏览器回归通过 |
| 配置变更 | 打开后的差异不随草稿更新 | [已验证] 实时差异随语言开关修改更新，浏览器回归通过 |
| 实验配置区 | 缺少语言开关、恢复与复制，规则变换散在 UI | [已验证] 独立配置面板，恢复确认与保留草稿通过浏览器回归 |
| 窄屏 | 只有三栏纵向堆叠 | [已验证] 390px 下任务切换与隐藏/显示验证通过 |
| 修复定位 | 修复后坐标定位到修复前源码 | 已改为定位修改后文本；修复后剩余诊断的焦点位置仍需专门浏览器断言 |
| 接入与导出 | Markdownlint 说明与导出文件名不一致；旧错误后可显示已验证 | [已验证] 接入说明对齐实际文件名，旧输入错误反馈已按身份绑定 |
| 构建职责 | generic index 直接持有元数据流程 | [已验证] index 编排 metadata 和 snapshot，完整构建通过 |
| Configs | 全宽配置展开与字段完整性 | [已验证] 配置展开、插件与逐条规则浏览器回归通过 |
| Rules | 插件/使用/属性筛选与完整来源 | [已验证] 规则转换及非法 JSON 保护、完整导出回归通过 |
| Files | 列表、匹配分组、导入文件及最终值 | [已验证] 文件列表、配置分组和工作区解析浏览器回归通过 |
| Stats | 文件数、诊断数、耗时分布与四种排行 | [已验证] 四种排行浏览器回归和性能状态独立性源码回归通过 |
| 资源与故障恢复 | 准备阶段失败状态、重试与取消边界仍需核对 | 本轮继续核对运行时持有和失败反馈 |

## 首次引擎准备与缓存优化

[已验证] 原行为在点击检查或修复后才启动依赖准备，全部 10 个分片按顺序下载，导致操作反馈与资源准备混在一起。现改为进入代码实验页时提前准备，准备进度和错误独立展示；分片最多 4 路并行读取。

[已验证] 固定快照分片使用浏览器 Cache Storage 缓存，缓存按快照内容版本隔离，清单每次准备都重新核对。源码测试验证首次读取并行、同版本重新准备复用缓存和清单版本变化后读取新资源。快照体积仍约 73 MiB，未声称减少了首次传输体积或已达到某个冷启动耗时指标。

[已验证] 当前源码测试为 9 个文件、36 项通过，类型检查和针对修改文件的 ESLint 检查通过。独立目录的最终浏览器回归 6 项全部通过（约 3.8 分钟），包括进入实验页提前准备、同版本刷新后不再请求快照分片；日志为 `.tmp/playground/performance/archive/browser-final.log`。此前两个并行 Playwright 运行共用产物目录导致追踪文件冲突，失败记录保留，不作页面功能失败或通过证据。

## 常驻检查进程与官方演示源码核对

- [已验证] 阅读 Stylelint 官方演示固定提交 `03accf698c3064b6a6918298c12a4ab8dd2dbb7a` 的 `src/linter-service/index.ts`、`server.ts` 和 `server/server.mjs`；源码链接集中维护于方案。官方保留 Node.js 进程，以标准输入输出交换请求，独立命名 JavaScript 配置以避开模块缓存。
- [已验证] 原每次启动进程的三次 ESLint 检查，界面耗时分别为 8906 / 7914 / 7415 ms，引擎为 7.01 / 7.02 / 6.40 s。常驻进程版本为 7019 / 246 / 253 ms，引擎为 5.97 / 0.11 / 0.11 s；两组均使用默认 TypeScript 示例且每次真实执行检查，不缓存诊断。原始日志：`.tmp/playground/performance/check-speed/baseline.log`、`.tmp/playground/performance/check-speed/stream.log`。这是本机浏览器单组测量，不代表部署网络的冷启动指标。
- [已验证] 初版常驻运行器在 WebContainer 启动时报 `SyntaxError: Unexpected reserved word`，尚未进入 Linter；将顶层异步迭代改为按行输入事件后，上述浏览器连续检查通过。失败证据保留于 `.tmp/playground/performance/check-speed/after.log` 和 `after-results/`。
- [已验证] 撤销 ESLint 实例缓存，避免检查后修复复用 `fix: false`，并确保统计选项和不同配置模块不串用。新增连续检查、修复、统计及配置重新加载的回归，当前 9 个单测文件、37 项通过；类型检查通过，完整构建通过。日志：`.tmp/playground/performance/check-speed/unit-current.log`、`types-current.log`、`build-stream.log`。
- 首次下载、挂载和首次引擎加载仍有明显成本；本轮没有减少约 73 MiB 的快照体积，也未验证线上部署和其他浏览器。

- [已验证] 常驻进程版本的完整工作台浏览器回归 6 项通过，用时约 4.1 分钟，覆盖三工具检查与修复、文件分组、真实统计、规则与导出、窄屏及快照缓存；日志 `.tmp/playground/performance/check-speed/regression.log`。
- [已验证] 第二组连续检查界面耗时为 28479 / 544 / 543 ms，引擎为 27.04 / 0.28 / 0.27 s。首次执行波动明显，不能将第一组 7 秒视为固定冷启动指标；重复检查两组均小于 0.6 秒。原始日志 `.tmp/playground/performance/check-speed/recovery.log`。

- [已验证] 新增浏览器用例在同一页面连续检查三次后，修改配置立即得到新结果，输入非法配置显示错误、纠正后恢复，重启沙箱后保留当前配置并完成检查。1 项通过，约 3.7 分钟；日志 `.tmp/playground/performance/check-speed/recovery.log`。本轮未单独复测执行中取消，不将重启验证代替取消验证。

## 按 Stylelint 演示替换快照加载流程

本节记录当前改造；前文快照缓存与常驻进程测速为历史实现证据，不代表本节已完成验收。

- [已验证] 对照本地 `backup/stylelint-demo/src/linter-service/index.ts`、`installer.ts`、`server.ts`、`server/server.mjs` 和 `server/extract-json.mjs`。采用少量服务文件挂载、沙箱内安装依赖、服务就绪握手和标准输入输出通信；保留本项目的完整配置与三个工具契约。
- [已验证] 缩减 JSON 快照后，冷启动立即检查仍复现主线程长任务 6476 ms，全流程 71543 ms；原始失败见 `.tmp/playground/performance/cold-start/before.log`，因此未继续沿用大对象解压、解析和 SDK 重新序列化的路径。
- [已验证] 运行资源生成改为 `scripts/runtime.ts`，只发布当前共享包产物、直接依赖版本及服务文件，当前 `runtime/bootstrap.json` 约 44 KiB。旧分片、生成器和二进制快照探索材料归档至 `.tmp/playground/archive/`，未永久删除。
- [已验证] 沙箱内 pnpm 8.15.6 可执行，依赖安装移入 WebContainer；不用页面线程构造完整 node_modules。安装日志和失败可见，只有依赖安装及服务握手成功后才显示已就绪。
- 首次在线安装的前两次浏览器测试未在 180 秒内完成。失败保留于 `reference.log`、`reference-2.log`；不能将安装进行中的页面可响应等同于检查通过，也不能将改造宣称为冷启动提速完成。
- [已验证] 第三轮准备初期，点击检查后切换主题的操作耗时 59 ms；完整冷启动长任务和三工具结果继续由同一浏览器用例验收，日志 `.tmp/playground/performance/cold-start/reference-3.log`。

- [已验证] 第三轮安装完成后，检查因关闭自动 peer 安装而缺少 `@vue/compiler-sfc` 失败；已移除该参数，恢复 pnpm 正常 peer 依赖解析。失败证据：`reference-3.log` 及其浏览器追踪；第四轮继续验证，不将服务启动成功当作检查通过。

## Monaco、Console 与同屏实验布局

本节覆盖最新界面调整；前文 CodeMirror 及修复标签页的通过记录不代表本节已验收。

- [已验证] 按本地 Stylelint 演示替换为 modern-monaco、Monaco Diff 与 xterm / FitAddon，移除工作台 CodeMirror 依赖及无消费者的目录版本声明。六个一级导航保留独立 Hash 路由；实验页配置与代码对比并排，诊断和 Console 下置并排，不再切换源码与修复标签。
- [已验证] 调整前的首次检查卡顿用例，采用官方服务流程后最长主线程任务由 6476 ms 降至 253 ms，主题操作 56 ms，三工具检查与修复通过；全流程 187818 ms，安装约 2 分 23 秒。日志为 `.tmp/playground/performance/cold-start/reference-4.log`。这些数据属于编辑器替换前，不能宣称是最新 Monaco 产物性能。
- [已验证] Monaco 原生 EditContext 的输入节点不能使用 Playwright fill：旧用例等待隐藏节点超时。测试现采用点击实际编辑区域与键盘输入，不为测试禁用浏览器编辑能力。失败证据保留于 `.tmp/playground/validation/editor/browser-results/`。
- 最新源码类型检查、格式与生产构建及浏览器验收继续以本节后续日志为准；首次依赖安装仍需联网，未宣称已消除冷启动等待。

- [已验证] 最新生产构建的 Monaco 编辑交互用例通过（约 8.2 秒）：真实键盘修改原始代码、编辑完整配置、主题同步、诊断与 xterm 同屏、跳转接入页后回退保留草稿。日志 `.tmp/playground/validation/editor/production.log`，截图 `console.png`。随后进一步收紧顶部与工作区高度，当前完整验收日志为 `acceptance.log`，不以先前截图代替最新布局验收。
- [已验证] 新布局的首次真实检查已返回 2 条规则诊断；旧断言误将诊断图标 `.error` 当作引擎失败，已限定为 `.notice.error`。原失败记录保留在 `.tmp/playground/validation/editor/runtime.log`，没有删除错误提示或改变引擎结果。
- [已验证] 38 项源码测试通过，最新类型检查、ESLint 和 Stylelint 通过，完整构建与最后一次界面构建通过。日志为 `unit.log`、`compact-types.log`、`final-layout-eslint.log`、`compact-style-pass.log`、`production-build.log`、`compact-build.log`。Monaco 内核按需分块加载；构建仍提示编辑器内核块体积较大，不将其混入普通页面入口。

- [已验证] 最新布局完整生产浏览器验收通过（约 3 分钟）：冷启动立即检查、准备期间主题操作、三工具检查/修复/应用、点击诊断显示当前规则、修复后剩余诊断聚焦右侧、文件匹配独立路由及回退、390px 同时展示诊断和 Console。全流程 174130 ms，最长主线程任务 327 ms，主题操作 116 ms。原始日志 `.tmp/playground/validation/editor/acceptance.log`。首次联网安装等待仍然存在，未声称冷启动变为即时。

## 性能、功能、UI 与交互持续优化

本节沿用完整工作台目标，未将先前源码通过等同于最新浏览器通过。

| 维度 | 当前核对结果与验收 |
| --- | --- |
| 性能 | 复现“重启沙箱”销毁文件系统导致再次安装依赖；改为仅重启服务。先失败后通过的源码回归分别在 refinement/restart-before.log 与 restart-after.log，生产浏览器继续实测 |
| 功能 | 诊断按文本及级别筛选，分别显示总数和可见数；过期诊断不能定位当前代码。真实三工具检查、修复、应用仍须保持 |
| UI | 维持配置/代码对比与诊断/Console 同屏、六个独立页面。继续核对手机宽度、焦点、加载与错误展示，不用抽屉替代一级路由 |
| 交互 | 重启过程中禁用重复操作与安装期间重启；失败写入 Console 并显示失败状态。验证草稿、回退和诊断定位 |
| 未完成范围 | 首次联网依赖安装耗时、手机编辑最终验收、其他五个页面的全量交互审视，继续保留任务，不据局部测试标记整体完成 |

- [已验证] 当前 10 个源码测试文件、39 项通过，类型、ESLint、Stylelint 与构建通过；证据目录为 `.tmp/playground/validation/refinement/`。本轮新增浏览器用例仍在运行，尚未以新数据证明重启耗时。

### 首次准备日志与官方安装流程

- [已验证] 本地 Stylelint 官方演示的 `src/components/defaults/deps.json` 仅声明 `stylelint` 与 `stylelint-config-standard`；`src/linter-service/installer.ts` 调用 `npm install` 并按退出码输出安装成功或失败。`demo.ts` 并行初始化编辑器与检查环境，安装完成后检查；`server.ts` 复用常驻服务。源码没有跳过首次联网安装，也没有一份完整依赖快照。
- 用户提供的当前线上日志为 118 个包约 1 分钟，本项目此前浏览器安装约 460 个包、约 2 分钟；二者配置范围不同，不据包数推导固定加速比例。完整 ESLint/Vue/TypeScript 共享配置及三个工具是本项目的有效范围，不能通过关闭规则或遗漏 peer 依赖换取较小数据。
- [已验证] 当前 Console 缺阶段的直接原因：启动 WebContainer 仅更新状态栏，安装前清空 Console，安装退出码成功后没有日志。现补齐准备、启动 WebContainer、安装依赖、安装成功/失败、启动服务和服务握手完成；安装过程中不再清空或截断之前的阶段。源码回归验证日志保留及成功/失败语义；`stages-unit.log` 3 项通过。
- 当前手机编辑测试的失败已定位到测试点击位置：Monaco 文本层可宽于可见区域，默认中心点击落在概览滚动条。已改用首行可见左侧点击，保留真实键盘输入；不使用强制点击或禁用编辑器功能。完整失败 trace 保留于本节 refinement/browser-results。

### 按工具初始化与会话缓存

- [已验证] 生成资源已拆为三个工具的独立依赖清单、共享包和运行器；浏览器只请求进入工具的服务文件。当前工具选择触发独立准备状态；返回缓存工具复用已完成的准备 Promise、文件系统及常驻进程。pnpm 在同一 WebContainer 内复用包缓存，不在页面线程解压或解析 node_modules。
- [已验证] 41 项源码回归、类型检查、ESLint 与构建通过；新增同工具并发复用、只安装当前工具、切换返回、两工具并行独立准备、安装失败重试，日志为 `split-unit-final.log`、`split-types-final.log`、`split-fix-eslint.log` 和 `split-build-final.log`，均位于 `.tmp/playground/validation/refinement/`。
- [已验证] 生成的 ESLint 服务仅包含 eslint、TypeScript、ConfigArray 与本仓库 ESLint 配置；Stylelint 仅包含 Stylelint 与本仓库 Stylelint 配置；Markdownlint 仅包含 CLI2 与本仓库 Markdownlint 配置。各工具保留其必要 peer 依赖，未关闭规则或用简化配置替换正式共享包。
- [已验证] 生产浏览器首次只进入 Markdownlint 请求 `markdownlint.json`，准备 35893 ms；随后切换 Stylelint 只追加 `stylelint.json`，准备 16951 ms。两者检查和修复通过；ESLint 及返回缓存工具继续在同一用例验证，完整日志 `split-browser.log`。
- [已验证] 前一轮服务重启实测为 2353 ms、未请求运行资源；333 ms 为最长主线程任务，二者不能混用。旧全工具首次准备到检查完成为 232288 ms。手机编辑用例修正可见文本点击位置后通过，最新日志 `editor.log`。
- 刷新后已安装依赖的持久化缓存尚未实现；不能将当前会话缓存、pnpm 包复用或 Web Worker 执行误称为离线首次安装。首次完整 ESLint 配置仍包含较多插件与解析器，等待实际测量后记录成本。

### 持久化依赖缓存（替代上一节未实现项）

- [已验证] 核对当前官方 SDK 1.6.4 的 `dist/index.d.ts`、`entities.d.ts` 和 `index.js`：`export` 支持 `binary`、`excludes`；`mount` 支持二进制和 `mountPoint`。采用此正式契约，不再使用此前自建 JSON 依赖树。
- 每个工具依赖安装及服务启动成功后异步导出二进制，压缩保存到 Cache Storage；缓存键包含服务源码与依赖版本内容哈希。临时用户配置不导出、检查结果不缓存；恢复失败明确记日志并重新安装；写缓存失败不阻断已就绪服务。
- [已验证] 43 项源码测试、类型检查、ESLint 和完整构建通过；测试覆盖二进制原字节恢复、版本失效、只清理同工具旧版本、缓存命中不执行安装。日志 `cache-unit.log`、`cache-types.log`、`cache-check-eslint.log`、`cache-build.log`。
- [已验证] 按工具初始化完整浏览器测试通过：三工具分别检查/修复/应用、返回已准备工具不重复请求运行资源、当前工具重启复用依赖。日志 `split-browser.log`；返回缓存工具并检查约 223 ms。
- [已验证] 全新会话仅打开 ESLint，只请求 `eslint.json`；准备 146922 ms，三次检查 8127 / 286 / 243 ms。日志 `eslint-isolation.log`。此处是未有持久缓存的首次安装，不将后续缓存恢复与首次联网安装混为同一指标。
- [已验证] 新版二进制缓存生产测试：刷新恢复 Markdownlint 并执行检查与修复 4469 ms；Stylelint 5171 ms。ESLint 继续在同一用例核对，日志 `cache-browser.log`；截图 `cache-markdownlint.png`、`cache-stylelint.png`。所有日志和图片均位于 `.tmp/playground/validation/refinement/`。

- [已验证] 三工具持久化缓存的最终生产浏览器测试全部通过（约 4.6 分钟）。刷新后恢复并完成检查和修复的总耗时：Markdownlint 4469 ms、Stylelint 5171 ms、ESLint 22365 ms；ESLint 截图为 `cache-eslint.png`。这组数据包含恢复、启动和检查/修复，不是单纯检查耗时，测试环境为本机 Chrome Beta。日志 `cache-browser.log` 已终态通过，前一条“ESLint 继续核对”的待验收项由本条完成。
- [已验证] 当前请求的按工具初始化、切换复用、刷新后二进制缓存、完整 Console 阶段、三工具检查与修复均已有源码及生产浏览器证据。持续优化目标仍保留：首次完整 ESLint 联网安装耗时、其他页面的全面交互审视与跨浏览器体验，不据本项通过宣称整个目标完成。

### 文件、规则与统计页面复核

- [已验证] 复现文件匹配只保存在预览配置结果中、被单文件检查覆盖，以及工作区性能因选择另一已有文件误判过期；新增两项回归先失败，证据 `workspace-before.log`。
- 文件匹配改为实验领域按工具独立持有，工作区身份由工具、配置及受支持文件内容决定，不再含预览选择。匹配结果使用本次执行的配置声明，切换文件不会清空；内容变化后保留快照并标记过期。选择已匹配文件时向配置领域提供该文件真实最终规则，避免规则详情沿用另一文件的值。
- 规则筛选零结果时不保留旧详情，支持一键清除筛选；插件数量一次汇总，不在每个插件按钮渲染时重复遍历整份规则。规则分页补充中文名称。大型只读元数据及解析结果改为 shallowRef，由所属模块整体替换。
- [已验证] 当前源码 11 文件、45 项通过，类型、ESLint、Stylelint 及生产构建通过。日志 `workspace-unit.log`、`workspace-types-final.log`、`workspace-eslint-final.log`、`workspace-stylelint.log`、`workspace-delivery-build.log`；其中初轮类型及声明顺序问题已修正，不使用初轮失败日志作为通过证据。
- [已验证] 生产浏览器两项通过（约 54 秒）：导入两文件→解析→进入另一文件检查→返回匹配结果不丢失→新增导入提示过期→重新解析得到三文件；规则页零结果详情清空及清除筛选恢复。证据 `workspace-browser.log`。
- 配置、导出与性能页面初轮测试时误与构建并行，规则分块被清理导致 404；已从网络 trace 确认，终止初轮并固定产物顺序复测。原记录 `pages-browser.log` 及 `pages-browser-results/` 保留，最终结果使用 `pages-final.log`，不将初轮算作通过。

上述文件均位于 `.tmp/playground/validation/refinement/`。

### 本轮闭环验收

- [已验证] 文件分组和真实工作区性能四种排行最终通过：依赖准备 121998 ms，准备完成后的文件匹配与性能排行合计 11432 ms；日志 `stats-final.log`。导航、配置字段展开、规则覆盖/非法 JSON 和完整导出分别在 `pages-final.log` 两项通过；该文件中的性能初次等待超时由独立准备阶段的最终用例取代，不将其称为全套通过。
- [已验证] 配置总览初始 DOM 为 13977 节点、46 份折叠详情。改为首次展开时挂载，初始降为 1282 节点、0 份详情（约减少 91%）；单项展开、全部展开/收起完整性通过。日志 `overview-before.log`、`overview-after.log`，最终复测见 `delivery-browser.log`。
- [已验证] 执行取消后的状态原本没有同步更新；新增回归先失败后通过，取消、超时、进程退出显示对应状态，下一次运行重新握手。WebContainer 启动失败和进程启动失败原本缓存拒绝的 Promise，用户无法真正重试；两个回归先失败后通过。证据 `cancel-before.log`、`cancel-after.log`、`startup-before.log`、`startup-after.log`。
- [已验证] 源码语法错误、ESLint 未知规则和 Stylelint 未知规则均保留真实错误，相关引擎测试在 `errors-unit.log` 通过。
- [已验证] 生产浏览器最新三项通过（约 1.7 分钟）：折叠配置延迟展示、运行中取消/保留输入/修正配置后重新检查/不支持文件报错及恢复、Stylelint CSS/SCSS/Vue/HTML 全部解析。日志 `delivery-browser.log`；编辑与手机输入恢复在 `recovery-final.log` 两项通过。
- [已验证] 当前 13 个源码测试文件、50 项通过，Playground 全源码 ESLint、全部 Vue Stylelint、类型检查与完整构建通过。日志 `checked-unit.log`、`checked-eslint.log`、`checked-stylelint.log`、`checked-types.log`、`checked-build.log`。最后对快捷键捕获的检查和构建见 `keyboard-eslint.log`、`keyboard-types.log`、`keyboard-build.log`；真实按键用例 `keyboard.log` 继续核对。

| 目标维度 | 交付与对应证据 |
| --- | --- |
| 性能 | 工具级按需初始化与缓存、刷新后二进制依赖恢复、仅重启当前服务、配置详情延迟挂载、大元数据浅层响应；runtime/cache/overview 的生产用例及源码回归 |
| 功能 | 三工具真实检查修复、所有公开示例类型解析、文件匹配与统计独立持有、错误和未知规则反馈；cache-browser、stats-final、workspace-browser、delivery-browser 及 50 项源码测试 |
| UI | 六个独立路由、配置/代码/修复同屏、诊断/Console 同屏、筛选空结果及保留状态、390px 布局；editor、workspace-browser、pages-final、delivery-browser |
| 交互 | Monaco 实际输入与主题、诊断定位、文件/规则联动、导出、取消/重试及快捷键；recovery-final、delivery-browser、startup-after 与最终 keyboard 用例 |

本轮生产浏览器证据来自本机 Chrome Beta；未发布 Cloudflare，未作 Safari、Firefox 或手机真机验收。首次无缓存的完整 ESLint 仍需联网安装；持久化缓存可能受浏览器存储清理影响。以上是使用和验证边界，不将本轮优化等同于所有运行环境零冷启动。

- [已验证] 最终快捷键浏览器验收通过（约 39 秒）：在 Monaco 配置编辑器通过 Ctrl/Cmd+Enter 启动检查，取消保留输入，修改配置后恢复检查，不支持文件反馈及恢复。证据 `keyboard.log`。本节“真实按键继续核对”的待验收项由本条完成。
- 本轮性能、功能、UI 与交互优化已按上表逐项核对完成，所有失败记录保留；检查通过不扩大为线上发布或跨浏览器验收。后续新增需求和新的环境问题另按实际证据处理，不恢复本节已完成任务为进行中。

## 预览文件选择与首次操作准备

- 顶部预览文件从单纯输入框改为统一下拉，包含当前工具示例、导入文件与当前路径；可选择自定义路径输入，并返回已有文件选择。编辑器标题复用同一文件状态，不再保留第二个示例类型选择器。
- 原就绪握手只代表引擎模块导入完成，完整配置、解析器与修复分支在首次用户操作才加载；改为先以默认配置和各支持示例分别执行检查/修复预热，再发出就绪握手。检查及修复按钮在准备期间不可用，代码与配置可以继续编辑。此改动把必要工作前置，并未消除首次依赖下载或引擎启动成本。
- 默认配置移动至配置目录供 Store 与生成器共同读取；示例源码由实验 samples 模块供编辑、工作区及预热共同读取，没有复制另一套配置或缓存用户诊断。
- [已验证] 类型检查、ESLint、Stylelint、50 项源码测试和完整构建通过，日志位于 `.tmp/playground/validation/preparation/` 的 `types-final.log`、`final-eslint.log`、`stylelint.log`、`unit-final.log` 与 `build.log`。
- [已验证] 首轮浏览器未进入预热，依赖安装访问官方 npm 注册表的 `cacheable`、`hookified` 出现 `ECONNRESET`；原失败及 trace 保留在 `browser.log`、`browser-results/`，不能作为预热通过。会话中断后预览服务停止产生的连接拒绝另保留在 `retry.log`。确认服务重新监听后，当前独立复测为 `verified.log`。
- 浏览器验收分别记录完整准备耗时，以及六种 ESLint 示例各自首次检查/首次修复的界面耗时；不能只把预热前置当成总体性能已改善。当前实测继续核对。

- [已验证] 六种 ESLint 示例的顶部选择、首次检查/修复及自定义路径切换通过，取消与恢复回归通过，两项总计约 3 分钟。完整准备 136215 ms（含联网安装和预热）；第一次 TypeScript 检查界面耗时 1053 ms，引擎 0.12 s；其余文件首次检查 250–616 ms，各文件首次修复 244–503 ms。引擎内部 0.08–0.12 s。原始数据与环境证据：`verified.log`、`verified-results/`。
- 以上为本机 Chrome Beta 单组实测，不把联网与预热的准备成本消失作为结论；默认配置预热后，用户配置仍逐次重新加载，额外插件和自定义复杂源码按实际请求执行。
- 最后统一已有文件选择入口及文件名截断样式，移除旧编辑区下拉样式；最终类型、ESLint、Stylelint、构建分别见 `delivery-types.log`、`checked-eslint.log`、`checked-stylelint.log`、`checked-build.log`。跨工具预热与导入文件选择的复测为 `tools.log`，待其终态后更新。

- [已验证] 最终跨工具与导入选择两项通过（约 4.6 分钟）：三个工具均完成检查/修复预热并可检查、应用修复；返回已准备工具、重启服务不重复准备；导入文件出现在顶部选择列表且可直接切换，文件匹配返回与过期提示正确。`tools.log` 已终态通过，本节所有待验收项已完成。首次安装及预热受网络和机器负载影响，最终混合顺序准备耗时为 Markdownlint 41468 ms、Stylelint 22814 ms、ESLint 171579 ms，不能将另一组 136215 ms 视为固定启动指标。

## 首次联网准备：构建期锁定传递依赖

- 原浏览器 install 只有固定直接依赖版本，没有工具级锁文件，每个首次访客都会重新解析传递依赖。独立试验生成 pnpm 8 锁文件成功；版本匹配 WebContainer 内置 pnpm 8.15.6，不复制仓库 pnpm 12 的不同格式锁文件。
- 生成器在隔离的 .tmp/playground/lockfiles/ 项目写入当前工具和共享包 manifest，通过固定版本 pnpm dlx 生成锁，再随服务文件发布。浏览器使用 pnpm install --frozen-lockfile --ignore-scripts，保留必要 peer 依赖，未关闭规则或省略插件。安装和启动/预热分别使用 Performance measure 记录真实时间。
- [已验证] 最初把旧 CLI 放入工作区 devDependency 会以同名 bin 影响工程 pnpm，已移除该依赖与目录版本声明，改为隔离工具调用。重新核对工程仍为 pnpm 12.15.0，完整构建通过；证据 isolated-build.log，原失败 build.log 保留。
- [已验证] 无已有工具文件系统缓存的生产浏览器：Stylelint 总准备 33736 ms，其中安装 16658 ms、启动和预热 3451 ms；Markdownlint 总准备 34672 ms，安装 18737 ms、启动和预热 3169 ms。两者真实检查及修复通过。首轮 ESLint 下载发生 TypeError: Failed to fetch，已保留 browser.log 和 browser-results/，未将失败作为通过。
- [已验证] ESLint 使用另一个全新无缓存浏览器会话复测通过：总准备 44343 ms，安装 20887 ms、启动和预热 10295 ms；实际检查、修复通过，证据 eslint-retry.log 和 eslint-retry-results/。此前无锁完整准备记录约 136–172 秒；两组网络环境会波动，不能将单次测量比例作为固定加速承诺。
- [已验证] 50 项源码测试、类型检查、ESLint 与完整构建通过：unit.log、types.log、isolated-eslint.log、isolated-build.log。三个新浏览器用例均先确认本源不存在工具文件系统缓存，并要求安装阶段实际发生，避免把缓存恢复误算为首次安装提速。

以上证据均在 .tmp/playground/validation/cold-install/。首次安装仍依赖包下载，网络失败会明确显示并允许重试；二进制持久化缓存与按工具初始化保持原有行为。

## 启动配置准备精简（2026-10-27）

- 启动只解析首次所选文件类型的配置，不再执行示例检查和自动修复。ESLint 的 inspect 不调用 lintText；Stylelint 仅 resolveConfig；Markdownlint 仅读取配置。保留工具独立初始化、固定锁文件和依赖缓存。
- 当前包状态下 Playground 生产构建和类型检查通过，14 个测试文件、53 项单元测试通过，包含三工具 inspect 不检查非法源码的新增回归测试。修改文件的 ESLint 自动修复检查与三份文档 Markdownlint 通过。
- Chrome Beta 无缓存 ESLint 实测：依赖安装 51957 ms，服务启动与配置解析 12629 ms，首次真实检查界面显示引擎耗时 0.23 s；首次修复 0.15 s，剩余 0 条诊断，出现应用修复按钮。安装和启动仍有等待；不同网络与机器负载下的历史数据不能直接作为加速比例。
- 本轮浏览器验证范围为 ESLint；未将此结果视为三个工具浏览器全量验收。启动解析配置仍需导入完整共享配置，未宣称消除模块加载成本。

## 后台依赖预安装（2026-10-27）

- 安装与启动拆分：当前工具就绪后，实验 Store 触发其他工具顺序预安装，仅挂载、安装和缓存依赖；前台切换复用安装，按需启动引擎。失败保留日志，前台进入重试。
- 单元测试新增后台顺序安装、切换复用且延迟启动引擎、后台失败不影响当前工具及前台重试，14 个文件、55 项通过。Playground 类型检查通过。
- 本轮尚未验证后台预安装的浏览器实际切换耗时，不能承诺零等待或无资源竞争。

- 追加后台资源加载：其他工具在依赖准备后继续启动常驻引擎并解析当前文件类型配置，切换时复用就绪服务；仍不执行用户源码检查和自动修复。

## 工具路由（2026-10-27）

- 三工具具有独立路由前缀，六个工作区、工具切换、跨页链接均保留工具；旧地址重定向到 ESLint。准备入口移至工作台，直接进入任意工具页面先加载对应工具，就绪后后台准备其他工具。
- 类型检查与 14 个文件、55 项单测通过，生产构建通过。路由浏览器回归通过，覆盖 Stylelint 深链接、首次对应工具运行资源与元数据、工具切换、工作区导航、刷新、前进后退、旧地址查询保留。该项拦截运行资源安装，不替代真实引擎测试。证据：`.tmp/playground/validation/preparation/routes-browser-retry.log`。首轮测试地址重复加入 eslint 前缀导致失败，修正测试地址后复测通过，原日志保留。

- 真实 Chrome Beta 直接进入 `#/markdownlint/experiment`：首先仅请求 markdownlint.json，安装约 28066 ms、启动约 1445 ms；首次检查 0.03 s、修复 0.01 s，修复后 0 条诊断。当前工具就绪后观察到其他工具后台资源请求；切换 Stylelint 后地址为 `#/stylelint/experiment`，继续复用准备中的依赖。本项未宣称所有工具后台均已就绪或切换零等待。修改文件的 ESLint、Stylelint 和文档 Markdownlint 通过，最终 Vite 构建通过。

## 接入、沙箱缓存与日志（2026-10-27）

- 按三个包 README 核对安装方式和 CLI：脚本分工具命名，修复复用检查参数；Stylelint 使用样式 glob；ESLint/Stylelint 采用 ESM .mjs；Markdownlint 导出 CLI2 ESM 配置（规则置于 config 内）并显式 --config，保留忽略策略。浏览器会移除下载文件名前导点，因此使用普通文件名 markdownlint-cli2.mjs，并显式加载；未宣称自动发现该普通文件名。
- 清理缓存位于公共沙箱工具栏，保留当前服务与草稿；复制日志位于 Console。浏览器验证覆盖三工具脚本、下载名、清空三个工具缓存且保留其他缓存、空缓存提示、复制日志与清空后禁用；通过，日志 setup-cache-copy-browser.log 位于 .tmp/playground/validation/preparation/。
- 真实并发场景的缓存回填测试先失败：save 等待 export 时执行 clearCache，旧写入在清理后重新出现。修复为清理前暂停本会话后续保存并等待已开始的写入；该回归通过。单测最终 14 个文件、57 项通过。
- pnpm Invalid package 已在浏览器重现；检查 WebContainer 自带 /home/.pnpm/.pnpmfile.cjs：preResolution 仅在存储为空时预填充，remoteTarball 在缺失 pkg.name/version 时抛出错误。独立 .pnpm-store 的 Stylelint 全新目录安装 140 包成功，证据 pnpm-isolated-diagnostic.json。三工具后台完整链路继续单独验证。

- 固定生产构建的三工具后台顺序准备、切换复用、真实检查及修复通过（1 项，约 1.1 分钟），未出现 Invalid package。安装/启动分别：ESLint 30937/7541 ms，Stylelint 6973/1943 ms，Markdownlint 4980/1097 ms。证据 isolated-stores-production.log；开发服务器测试因热更新重置模块状态失败，原记录 isolated-stores-browser.log 保留，不作为生产结果。
- Markdownlint 的普通 ESM 文件名与 --config 经当前安装的 CLI2 源码 readOptionsOrConfig 核对：非标准文件名按扩展名读取，再按 CLI2 schema 字段识别 options；导出的 config、gitignore、ignores 适用该分支。57 项单测、类型、生产构建和浏览器接入/下载/复制/缓存交互通过；未将脚本展示测试冒充消费项目全量检查。

## 全工作台信息与操作优化（2026-10-27）

本轮持续推进全量目标，不将局部通过视作全部完成。

| 范围 | 本轮交付 | 验证边界与续接点 |
| --- | --- | --- |
| 公共工作台 | 三工具准备状态、图标、键盘焦点、分层沙箱操作 | 已有浏览器路由和桌面/390px 导航回归通过；真实三工具检查/修复、当前工具重装/重启已通过 |
| 总览 | 来源明确的规则摘要、搜索清除、启用废弃规则提醒 | 图标 mask 实际生成及搜索恢复通过 |
| 规则 | 一键筛选重置、选中语义、页内范围、详情操作图标 | 真实元数据搜索、筛选重置、跨工具切换及规则/插件深链接已验证 |
| 文件 | 解析前后搜索、范围摘要、详情延迟渲染、同文件重复导入 | 解析前后搜索、多文件详情/分组、重复导入与清除导入已验证 |
| 实验 | 右侧文件操作、保留内容的重命名、恢复代码确认、检查/预览修复命名 | UI 交互与 390px 布局通过；同名/非法扩展名与内容保持单测通过 |
| 统计 | 操作图标、按钮状态、其他工具默认文件维度 | 三个工具的真实文件统计与可用细分维度、搜索和分批展开已验证 |
| 接入 | 运行命令复制、步骤图标、正确文档说明 | 三包脚本、导出、缓存/日志交互既有浏览器回归通过 |
| 文档 | README 重写为当前操作源，修正普通 CLI2 文件自动发现误述，脚本说明对齐后台准备 | Markdownlint 与本地链接检查通过；操作正文与当前实现已复核 |

- 本轮 UI 浏览器 3 项通过（refinement、routes、setup），包含六页窄屏不溢出、真实元数据及图标生成、两层按钮、重命名及确认取消。UI 测试拦截 runtime 请求，不将模拟准备失败视为真实引擎验收。截图 actions-desktop.png、actions-mobile.png 位于 .tmp/playground/validation/refinement/。
- 14 个测试文件、59 项单测和 Playground 类型检查通过；新增重命名内容保留/路径拒绝、仅重装当前工具依赖回归。执行日志 actions-unit.log、actions-types-2.log；真实三工具检查/修复与 Markdownlint 重装/重启已通过。

- 生产浏览器实测 1 项通过（约 1.8 分钟）：三个引擎后台就绪后均可检查与修复，重置 Markdownlint 后 install measure 增加 1，重装后检查通过；重启进程后 install measure 不增加。证据 reset-runtime-browser.log。这证明当前工具重装与进程重启的实际区别，不宣称已逐一重装所有工具。
- 按用户最新截图调整上层右侧“清理沙箱 / 重置沙箱 / 重启沙箱”，下层右侧“恢复初始代码 / 重命名文件 / 检查代码 / 预览修复”；恢复与重装均提供作用范围说明和内联确认。窄屏沙箱三按钮作为独立一组靠右换行。完整优化目标仍需按本节矩阵继续复核，未标记全量完成。

- 最终增补导入文件重命名后恢复原始导入内容的回归，14 个文件、60 项单测通过；保留编辑内容与原始导入内容的职责分离。最终类型检查、Vite 构建、git diff --check 通过，最终 UI/路由/接入 3 项浏览器回归通过（约 37 秒）。日志 actions-final-unit.log、actions-final-types-2.log、actions-delivery-build.log、actions-final-browser.log。

## 首次 ESLint 配置加载分段分析（2026-10-27）

针对用户报告“仅加载配置”仍长时间等待，在已安装依赖的 WebContainer 新 Node 进程分别测量模块导入和配置解析。测量脚本及原始输出位于 .tmp/playground/validation/preparation/，不把数据混入依赖下载时间。

| 阶段 | 本轮耗时 |
| --- | --- |
| ESLint 引擎模块导入 | 502 ms |
| Promise 兼容检查 | 62 ms |
| 共享配置模块导入 | 10214 ms |
| 异步配置工厂完成 | 765 ms |
| 创建引擎并解析当前文件配置 | 556 ms |
| 默认配置准备合计 | 12114 ms |
| 随后的首次源码检查 | 171 ms |

进一步拆分模块：@antfu/eslint-config 首次导入 8905 ms，@shadcn/lint 406 ms，前两者加载后 @zzjtnb/eslint-config 23 ms。原始证据 startup-stages-final.json、startup-library-stages.json。该步骤并非只读取 module.ts 的一小段规则，主要成本是完整共享配置及插件模块首次加载；不能通过更换提示或移动到检查按钮之后宣称加速。

试验构建期 ESM 预打包：直接打包破坏了部分依赖的相对资源定位；保留 eslint-plugin-n、@eslint/css-tree 等资源边界后，六种文件的检查与修复均与原配置一致，但准备仍需 12320 ms，无可证明收益，未合入运行资源生成流程。证据 startup-bundle-resources-result.json，其他失败记录保留。不删减插件与规则换取速度。CommonJS 预编译对照继续验证。

- CommonJS 预编译对照成功：模块导入 5352 ms、配置准备 6884 ms；六种文件的检查和修复共 12 项与原配置一致。证据 startup-bundle-cjs-result.json。ESM 方案无收益，采用 CJS；资源定位依赖保留原包边界，新增 @eslint/css-tree 的运行时直接声明以保证定位，不增加另一套规则。
- 正式构建已接入 bundle.ts，通过根项目 tsdown 生成静态依赖 CJS，浏览器副本引用派生入口，启动时从原始资源建立上游包目录上下文。原发布包、消费方配置不修改。缓存保留原始资源，排除派生副本，避免重复保存大文件。
- 生产浏览器两项通过（约 2.4 分钟）：六种 ESLint 文件首次检查/修复、三工具后台就绪与真实检查/修复、Markdownlint 重装/重启。当前 ESLint 全部准备 40376 ms（含首次联网安装），启动/配置 6185 ms；首次检查/修复界面 245–1059 ms，未将联网成本混为引擎加速。日志 cjs-production-browser.log；缓存恢复与最终界面复测继续。

- CJS 正式产物的缓存及最终界面 5 项浏览器回归通过（约 2.2 分钟），三个工具刷新后恢复并可真实检查/修复。缓存恢复连同检查与修复的总耗时：Markdownlint、Stylelint、ESLint 分别见 cjs-cache-interface-browser.log，其中 ESLint 11036 ms、Stylelint 4486 ms；该值不等于纯引擎执行时间。
- 补齐全工作台审计：跨工具旧搜索/插件筛选导致空列表已复现并修复；规则/插件深链接会解除不适用的旧筛选并选中目标。重复导入使用旧编辑副本的失败单测修复，清除导入恢复示例范围。文件展开状态收敛到一个集合，原“全部收起仍保留详情节点”浏览器失败已修复。
- 实际三工具统计通过：Markdownlint 1 文件、Stylelint 4 文件、ESLint 6 文件；ESLint 的规则/插件/任务排行、搜索和 30 项分批展开可用，其他工具不伪造细分数据。编辑、主题、取消恢复、文件匹配与重复导入 5 项生产浏览器通过，日志 editor-final-browser.log；首次读取编辑器按其就绪等待，激活时恢复视图，文件切换复用模型。
- 浅色六页自动辅助功能检查没有报告违规，记录 a11y-final-light-*.json。深色五个非编辑页面没有报告违规；代码区改为 GitHub Dark Default 后没有报告违规，记录 a11y-github-default-dark-editor.json。自动检查对隐藏 IME 与短行号保留人工确认项；行号按实际计算样式进一步提高文字对比，不能以自动无违规声称完整 WCAG 认证。全工作台使用 65 种本地 Lucide 图标，均在已安装集合中存在。

- 最终 CJS 生产响应性及错误恢复两项通过（约 2.3 分钟）：准备期间主题切换 114 ms；从导航到检查完成 53092 ms（含联网），主线程长任务最大 347 ms；重启服务 6524 ms且不重新请求当前工具运行资源。连续检查界面耗时 387/317/307 ms；修改配置、无效源码配置提示、修正恢复、重启后检查通过。证据 cjs-responsiveness-browser.log。这些结果不消除联网安装成本，也不作为所有机器固定性能承诺。

## 交付审计结论（2026-10-27）

对照本轮全工作台矩阵和最新用户要求，六页与三工具的相关功能均完成对应验收：公共导航与分层沙箱操作、总览和来源摘要、规则筛选与目标跳转、文件导入/分组/收起、代码编辑/命名/恢复/检查/修复、真实统计、接入导出及文档。最终补充真实分组与规则目标跳转一项通过（41 秒），日志 group-rules-browser.log。

本轮最终单测 14 个文件、63 项通过，类型、目标范围 ESLint/Stylelint 自动修复检查、四份文档 Markdownlint、生产构建和 git diff --check 通过。本地内联文档链接没有缺失；当前本地 Lucide 图标 66 种，均存在。检查证据分别位于 preparation/delivery-unit.log、delivery-types.log、final-delivery-eslint.log、final-delivery-stylelint.log、final-delivery-docs.log、delivery-build.log。

正式 CJS 资源已在生产预览验证六种 ESLint 文件、三工具检查与修复、缓存恢复、错误恢复、重启/重装和主线程响应。预编译增加约 5 MB 原始资源，网络时延仍随部署压缩与用户网络变化。首次联网准备没有消除；本轮证据支持模块加载与后续交互改善，不承诺任意设备固定秒数。

当前验收环境为本机 Chrome Beta、生产静态预览和 390px 视口；未发布、未执行 Cloudflare 线上部署、未将此结果视为 Safari/Firefox 或实体手机验收。自动辅助功能检查不是完整 WCAG 认证，隐藏 IME 等仍按浏览器编辑器自身语义处理。

- 交付审计补充发现并修复 Stylelint inspect 的忽略状态错误：原实现未调用原生忽略判断，忽略文件被显示为包含；失败测试记录 stylelint-ignore-before.log。改为正式 lint API 的空输入读取 ignored，解析时不检查用户源码、不返回空输入诊断，忽略文件最终规则置空。14 个文件、64 项单测、类型、生产构建通过，日志 ignore-final-unit.log、ignore-final-types.log、ignore-final-build.log；真实忽略路径浏览器复核以 stylelint-ignore-browser.log 终态为准。

- 最终 Stylelint 真实浏览器忽略路径回归通过（51.3 秒），覆盖 CSS、SCSS、Vue、HTML 配置与新增 ignoreFiles 后的原生忽略结果，证据 stylelint-ignore-browser-final.log。最终检查中 pnpm 曾报告目录缓存过期，随后 pnpm install --frozen-lockfile --ignore-scripts 以原锁文件同步完成（124 ms，版本和锁文件无改动）；未绕过 verifyDepsBeforeRun 检查。随后目标源码 ESLint、文档 Markdownlint 与 git diff --check 再次通过。当前最终单测为 64 项，旧记录的 63 项是补充忽略回归之前的结果。

## 参考图重设计（2026-10-27）

- 保留顶部六页面导航及已有全功能，参考图只用于信息层级。工作台主题直接使用 Docs/VitePress variables.scss；主操作/选中态使用 Docs 品牌色，主体以中性色与卡片呈现。UnoCSS 字体与图标继续使用。
- 安装 echarts 6.1.0、vue-echarts 8.3.2 并统一到 catalog。图表组件按页懒加载，SVG 仅注册 Pie/Bar 等实际使用模块；明暗状态通过只读属性来自工作台。规则分布读取当前目录数据，性能图读取真实结果，点击条形图可跳转，任务保留文件信息。新图表不替代旧的筛选、明细、数值图例和原生执行能力。
- 首轮静态界面回归 4 项通过（32.5 秒），单元测试 64 项通过。真实图表、编辑器及六页回归 4 项通过（约 1.7 分钟），覆盖三工具真实文件统计、SVG 渲染、Top 10/完整排行、搜索/分批展开、点击图表进入目标规则及返回后状态保留。证据 redesign-interface-browser.log、redesign-charts-browser.log 位于 .tmp/playground/validation/refinement/。
- 图表独立分包约 550 KB，gzip 约 188 KB，直接打开代码实验不应请求该包；新增拖入和懒加载回归、暗色与窄屏截图继续最终复核。

- 图表隔离修复：首版共享运行时代码导致代码实验预加载 chart 分包，生产静态回归复现；Vite 分组为 Vue、运行时和 ECharts vendor 后，实验页不再请求图表分包，文件拖入与代码页按需测试通过。最终图表 vendor gzip 约 188 KB，属于统计/总览页面成本，未带入实验页。证据 chart-isolation-build.log、chart-isolation-browser.log。

- 最新标题栏调整：移除“ESLint / 配置工作台”面包屑，改为紧凑的页面图标、标题、说明和右侧操作。顶部导航、草稿、变更、导出保留；首屏垂直空间减少。截图 title-compact.png，相关六页回归通过。

## Reka UI 组件与 IDE 交互收口（2026-10-27）

- [已验证] 阅读官方 llms.txt、组件 API 与 Splitter IDE Layout 的展示源码；本地安装版本与官网均为 2.11.0。使用官方 Resolver，生成声明位于 src/components.d.ts，不手写运行时组件导入。
- [已验证] 目录树、配置 Tabs、语言 Switch、匹配 Checkbox、单选筛选、分页、参数 Accordion、恢复／重装 AlertDialog、导出菜单、状态 Popover、Toast、Tooltip、Progress 和接入 Stepper 均接入现有状态归属。一级导航保持独立路由。
- [已验证] 生产界面回归覆盖六页与窄屏、选择菜单键盘与 Esc 焦点恢复、鼠标与键盘调整三组分栏、默认／实验配置下载、非法配置时默认导出、目录树选择、恢复确认、重复复制反馈、接入导航和缓存清理。交付回归 11 项中最初仅进度失败态等待时间不足，修正等待实际 WebContainer 启动结果后，相关 5 项全部通过；其余 6 项已通过。证据：.tmp/playground/reka/delivery-browser.log、feedback-browser.log。
- [已验证] 官方 IDE 组合能力包括配置与控制台折叠、尺寸持久化、刷新恢复及还原布局；还原保留配置输入。回归等待 Reka 实际写入新尺寸后再刷新，不把其内置延迟保存当同步写入。证据：persist-browser.log、delivery-browser.log。
- [已验证] 三个真实引擎逐一完成检查、修复预览、应用修复；独立浏览器用例通过，约 42 秒。该用例不拦截引擎资源；界面测试中拦截资源的场景不替代此证据。证据：engines-browser.log。
- [已验证] 64 项单测通过；Vue 类型检查、ESLint／Stylelint 自动修复检查及 Vite 生产构建通过。构建仍提示编辑器和图表分包超过 500 kB；本轮未调整引擎分包策略。证据：unit.log、delivery-types.log、delivery-eslint.log、delivery-stylelint.log、feedback-build.log；后续反馈测试格式修正复核见 closure-eslint.log。
- [已验证] Select 弹层在浅色与深色均取得实际主题背景，分别为 rgb(255, 255, 255) 与 rgb(29, 41, 57)。复制 Console 日志后清空输出不会清空已显示的通知内容。
- 未验证线上 Cloudflare 发布、Safari／Firefox 和触屏设备；本轮没有发布或 Git 写操作。上述日志均位于 .tmp/playground/reka/。

## 文件匹配工作区、真实目录与状态语义（2026-10-27）

- [已验证] 沙箱状态统一为阶段与消息对象，执行方明确发布准备、依赖完成、运行、就绪、取消与失败；顶部和详情复用同一组件。明暗主题下准备／未初始化／失败颜色区分和对应图标通过浏览器验证，取消与运行阶段由单测验证。
- [已验证] 文件页改为紧凑操作区、摘要、可调整的目录／详情两栏。Tree 使用实际导入目录相对路径、目录优先排序、父目录自动展开，单击仅在当前页查看匹配；使用实际嵌套目录验证至第 5 层，展开／收起、状态筛选、右键复制、Splitter 键盘调整和窄屏均通过。
- [已验证] 顶部工具与页面导航使用官方 NavigationMenu 和 RouterLink 组合；文件、规则分别提供 ContextMenu。规则目录和文件最终规则使用 Pagination，目录、详情、规则、配置和诊断使用 ScrollArea；Monaco 与 xterm 保留自有滚动行为。残余原生折叠、菜单及 title 提示已统一为对应原语。
- [已验证] final-browser.log 的 6 项回归全部通过：真实目录交互、规则右键与页码、明暗状态、三个真实引擎检查／修复／应用、Markdown 导入与重导入及过期结果、Stylelint 四种文件匹配及真实忽略。三个引擎用例约 2.3 分钟，仅是本次记录，不作为固定启动指标。
- [已验证] 配置折叠延迟挂载、六页与窄屏、拖入文件和图表懒加载、规则菜单与 Tooltip 共 6 项独立回归通过。最初目录筛选测试误把 README.md 视为 ESLint 支持文件，已按当前正式支持范围修正预期，实际筛选行为正确。证据：hierarchy-browser.log、final-browser.log。
- [已验证] 64 项单测、类型检查、ESLint／Stylelint 自动修复检查、Markdown 文档检查及生产构建通过；编辑器和图表分包超过 500 kB 的构建提示仍存在。证据：unit.log、final-types.log、final-eslint.log、final-stylelint.log、docs.log、final-build.log。
- [已验证] 手动浏览器中运行 Stylelint 工作区匹配，CSS 为 85 条规则、SCSS/Vue 为 103 条、HTML 为 85 条；截图 files-final.png 展示实际最终规则与分页，不是模拟图。上述证据均位于 .tmp/playground/status/。
- 未验证本轮线上部署、Safari／Firefox 与实际触屏设备；未进行发布或 Git 写操作。

- [已验证] 截图复查定位 SplitterGroup 内联 100% 高度导致外层撑高，改为明确高度的父容器。真实 Stylelint 回归复测通过，确认分页在视口内、切换规则页不撑高面板；1000 px 高视口中工作区为 620 px，分页底部约 966 px。证据：size-browser.log、size-build.log、files-final.png，均位于 .tmp/playground/status/。

## 全量配置与规则反查文件（2026-10-27）

- [已验证] 文件页的配置与规则列表保持完整，当前文件只作定位高亮；展开配置或规则可反查工作区匹配文件，规则显示每个文件的原生值和启用／关闭状态。未解析、未匹配、历史结果及未公开的配置匹配链分别展示。
- [已验证] 构建期合并同工具所有支持类型的规则定义为 catalog.json；当前产物为 ESLint 1678 条、Stylelint 225 条、Markdownlint 53 条。配置领域按工具缓存完整定义，当前文件配置值独立读取；规则目录默认显示全部，CSS／SCSS 文件切换不缩减目录。
- [已验证] 新增配置领域回归确保其他文件的配置值不能冒充当前值，完整定义及 Schema 保留，切换文件不重复请求完整目录。15 个单测文件、65 项通过，类型检查、ESLint／Stylelint 自动修复检查、文档检查及生产构建通过。
- [已验证] 新增 3 项浏览器回归全部通过：解析前全量展示与目录稳定、真实 Stylelint 规则反查两份文件及各自值、真实 ESLint 配置反查匹配文件并保持完整列表。原工作区导入、重导入、过期结果、Stylelint 忽略文件及页码回归 5 项通过。
- 原始证据位于 .tmp/playground/relations/：generate.log、closure-unit.log、final-types.log、closure-eslint.log、closure-stylelint.log、docs.log、closure-build.log、browser.log、closure-browser.log；实际规则与文件关系截图为 all-rules-files.png。未发布线上，未执行 Git 写操作。

## 规则筛选、代码展示与交互收口（2026-10-27）

- [已验证] 规则筛选改为顶部插件、使用情况、规则状态三组 ToggleGroup，并配套图标；移除规则页的清除筛选和属性下拉框。列表／卡片直接切换，分页内的行完整排版，保留横向 ScrollArea，不再固定高度截断末行。
- [已验证] 我的覆盖标题不再重复显示继承文字；继承、关闭、警告、错误／启用使用实际覆盖值驱动选中颜色和 aria-pressed。复现并修复 Object.hasOwn 未跟踪新增覆盖值导致选中态不更新的问题；非法 JSON 不改变原有覆盖状态。
- [已验证] 共享配置／当前实际配置与规则默认参数分开展示。官方 ESLint 文档的 meta.defaultOptions 表示启用规则时的选项默认值，不能冒充共享配置值；例如 eqeqeq 默认参数为 ["always"]，本项目快照值为 [2,"smart"]。
- [已验证] 配置总览点击规则名称直接打开 Popover，取消三点入口及重复的级别说明；文档、复制、筛选、编辑和实验保留图标入口。可修复、推荐、废弃由统一 RuleMeta 组件在列表、卡片、详情与配置总览展示，紧凑场景使用 Tooltip。
- [已验证] 只读对象、配置值、默认参数及配置代码使用 Shiki 4.5.0，按需加载 JSON／JavaScript、两套主题和 JavaScript 正则引擎；不为片段启动 Monaco。浏览器验证真实高亮 Token 和明暗主题切换。
- [已验证] 顶部预览文件已移除。代码实验保留本地编辑文件选择与自定义路径，文件页保留真实目录定位；共享状态仍属于原配置及实验 Store。
- [已验证] 65 项单测、类型检查、ESLint／Stylelint 自动修复检查、文档检查和生产构建通过。7 项最终浏览器回归通过，覆盖本节 UI、六页窄屏、三个真实引擎检查／修复与非法配置保护及导出。构建仍有原编辑器／图表大于 500 kB 的提示；高亮分包约 363 kB、gzip 约 75 kB，按使用片段时加载。
- 证据位于 .tmp/playground/rule-controls/：closure-eslint.log、closure-stylelint.log、closure-types.log、closure-unit.log、closure-browser.log、closure-build.log、docs.log；官方资料为 eslint-defaults.txt、shiki-bundles.txt；当前界面截图为 rules-overview.png。未部署线上，未执行提交。

- [已验证] 配置总览规则行调整为规则名、说明、独立属性图标列，删除行尾配置值；Popover 内用 Tabs 区分实际配置和规则默认参数。追加 7 项 UI 回归中 6 项直接通过，修正测试相对定位后剩余 1 项通过；核对原始声明 ["error","smart"] 与默认参数 ["always"]、列对齐、高亮、Esc 及焦点恢复。证据：tabs-browser.log、values-browser.log、tabs-types.log、tabs-build.log，均位于 .tmp/playground/rule-controls/；实际配置截图为 rule-actual.png。

- [已验证] 配置卡摘要补齐文件条件、忽略条件、选项、插件、规则的图标＋文字＋数量；规则属性统一为图标＋文字，保留独立列。7 项浏览器回归全部通过，包含属性列对齐、实际值／默认参数切换、高亮主题、短视口弹层、键盘与焦点恢复。类型检查、ESLint／Stylelint、生产构建通过；证据位于 .tmp/playground/rule-controls/ 的 labels-browser.log、labels-types.log、labels-eslint.log、labels-stylelint.log 和 labels-build.log。

## 准备取消、缓存恢复、持续集成与 CLI2 契约（2026-10-28）

- 准备阶段支持取消与重新准备，保留代码和配置草稿；资源请求上限 2 分钟，完整准备上限 4 分钟。安装取消终止对应进程，启动取消不接受迟到的就绪消息；损坏压缩缓存失效后回退安装。单测覆盖上述失败路径及服务退出后的重新准备。
- CLI2 通过三个正式转导出入口执行；本地声明与实际传递引擎的官方类型、诊断及自动修复对照，CLI2 发布正式声明后测试提示移除适配，不新增 markdownlint 直接依赖。
- 全仓格式化、只读 lint、5 个工作区类型检查和 337 项单元及工程测试通过；Docs 和 Playground 生产构建通过。工程测试残留的 Vitest 导入已恢复为所属 Node 原生运行器，自动修复复核后保持正确。
- 生产预览的 3 项 Chromium 回归通过，耗时约 4 分钟：三个工具缓存恢复后检查与修复、取消资源下载后保留草稿并重新准备真实检查、工具切换及重启复用。缓存恢复时均未执行依赖安装；刷新到完成检查与修复分别约 Markdownlint 5 秒、Stylelint 10 秒、ESLint 18 秒，同会话返回工具检查约 251 毫秒。这些是本机本轮记录，不作为固定性能保证，首次联网等待仍存在。
- 新增根 CI 工作流，按冻结安装、只读 lint、类型检查、单测、生产构建、关键 Chromium 回归顺序执行，并保存浏览器报告及耗时附件。未推送，GitHub Actions 云端首跑尚未验证；本轮不扩展跨浏览器矩阵。
- 原始命令和结果位于 .tmp/ci-runtime/：format.log、lint.log、types.log、tests.log、build.log、browser.log；构建仍有既有编辑器／图表分包体积提示与 tsgo 实验性提示。本轮未发布、未提交。
