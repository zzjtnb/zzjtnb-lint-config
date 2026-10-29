# 在线配置实验台方案与验证依据

确定日期：2026-10-25。

本文是本次在线实验台改造的方案正文源，定义目标、执行架构、页面流程及验收边界。方案用于约束正式实现；实现与验收状态集中记录在 `验证记录.md`。末尾的验证依据记录本次隔离实验结果，后续实现进度不追加到本文。

## 目标与范围

用户在部署后的网页上修改真实共享配置和规则，输入示例代码，运行检查，定位诊断，预览并应用自动修复，最后复制或下载已经测试的配置。部署保持纯静态，不要求访问者启动本地运行器，不增加线上检查后端。

覆盖 ESLint、Stylelint、Markdownlint 三个工具，沿用各自的正式配置语义及公开包入口。保留现有规则检索、元数据、配置来源、文件匹配和接入说明，让它们服务于编辑与验证流程。

## 执行架构

统一使用 WebContainer，在访问者浏览器内启动 Node.js 环境，加载共享配置、引擎、插件和解析器。三个工具分别调用正式 API，统一的是执行环境和界面流程，不强行统一配置结构。

| 工具 | 运行环境 | 检查与修复入口 |
| --- | --- | --- |
| ESLint | WebContainer 内 Node.js | `ESLint.lintText()`，修复时设置 `fix: true` |
| Stylelint | WebContainer 内 Node.js | `stylelint.lint()`，修复时设置 `fix: true` |
| Markdownlint | WebContainer 内 Node.js | `lint()` 产生诊断，`applyFixes()` 应用修复，再次检查修复结果 |

`Linter.verifyAndFix()` 是 ESLint 的底层检查与修复 API，不能单凭它证明当前共享配置、插件、TypeScript 或 Vue 解析器可以直接打包进浏览器。混合使用浏览器包和 WebContainer 会增加依赖适配与行为一致性的维护成本，本方案不采用该路线。

执行链路：

1. 页面按需初始化沙箱，明确展示准备、就绪或失败状态。
2. 挂载与站点同次发布的共享包产物和检查服务文件，在 WebContainer 内安装依赖并等待服务握手就绪。
3. 将当前配置、虚拟文件名与源码写入沙箱独立工作目录。
4. 在沙箱中加载配置，通过真实引擎检查输入源码，返回原始诊断及可用的修复后源码。
5. 页面按本次执行所属工具、文件和输入版本接收结果；过期结果不能覆盖新输入。

配置文件在沙箱内作为配置模块执行；示例源码仅传给检查引擎，不作为用户程序运行。执行配置不等于无副作用，沙箱不是网络断开环境，页面须准确说明执行边界。

构建时仍可生成规则目录和说明快照，供搜索与初始浏览使用。修改后的最终生效配置及检查结果以沙箱引擎为准，不能把静态快照或简单对象合并显示成真实解析结果。

## 原生浏览器能力与自动修复

三个工具的原生修复能力和本项目选用的执行环境分开说明：

| 工具 | 原生能力 | 可采用的运行方式 | 本方案选择 |
| --- | --- | --- | --- |
| ESLint | `Linter.verifyAndFix()` | 浏览器 `Linter`；Node.js `Linter` 或 `ESLint` | WebContainer 内 `ESLint`，加载完整配置 |
| Stylelint | `stylelint.lint({ fix: true })` | Node.js；官方演示使用 WebContainer | WebContainer 内 `stylelint.lint()` |
| Markdownlint | `lint()` / `lintSync()` 与 `applyFixes()` | 官方浏览器构建；Node.js | WebContainer 内加载配置并执行 |

单个 WebContainer 在一次页面会话中按工具分别保留 Node.js 检查进程，通过标准输入发送请求，通过标准输出读取带请求标识的结果。第三方模块由进程复用；每次运行使用独立配置模块重新读取当前配置，并按本次操作创建 ESLint 实例，避免检查、修复、统计选项互相污染。不缓存诊断结果。取消、超时或用户重启只终止当前工具进程，下次操作重新启动并复用已有依赖；业务草稿继续由 Store 持有。

Stylelint 官方演示的实现可直接核对以下源码（固定版本 `03accf698c3064b6a6918298c12a4ab8dd2dbb7a`）：

- [浏览器服务管理](https://github.com/stylelint/stylelint-demo/blob/03accf698c3064b6a6918298c12a4ab8dd2dbb7a/src/linter-service/server.ts)：启动并保留 Node.js 进程，使用输入输出流传递请求和结果。
- [Node.js 检查服务](https://github.com/stylelint/stylelint-demo/blob/03accf698c3064b6a6918298c12a4ab8dd2dbb7a/src/linter-service/server/server.mjs)：模块顶层导入 Stylelint，输入事件触发检查；为 JavaScript 配置创建独立文件名绕过模块缓存；分别调用检查和 `fix: true`，返回诊断与修复文本。
- [服务编排](https://github.com/stylelint/stylelint-demo/blob/03accf698c3064b6a6918298c12a4ab8dd2dbb7a/src/linter-service/index.ts)：管理 WebContainer、依赖安装和带版本的检查请求。

本工作台沿用本地 `backup/stylelint-demo/src/linter-service/` 的启动与通信流程：小型服务文件挂载、沙箱内安装依赖、常驻服务就绪握手和输入输出传递检查结果。包管理器使用已在沙箱验证可用的 pnpm；共享包使用当前仓库构建产物；检查与修复仍由用户分别触发。运行器使用按行输入事件接收命令，避开已在 WebContainer 复现的顶层异步迭代启动失败。

ESLint 官方明确说明：`ESLint` 类依赖 Node.js 文件系统，普通浏览器应使用 `Linter`；`Linter` 不处理配置文件。因此“浏览器支持 Linter”成立，但完整配置文件的加载、模块导入和插件解析仍须由应用解决。WebContainer 提供 Node.js 环境，所以可以使用 `ESLint` 类；这不是在普通浏览器环境直接调用该类。

Markdownlint 官方 README 同时提供 Browser 和 Fixing 说明。浏览器构建可通过 `globalThis.markdownlint.lintSync()` 检查文本，修复使用导出的 `applyFixes(input, errors)`。浏览器中需要的配置和规则须预先准备，不能据此假定 Node.js 配置加载路径天然可用。

以下是各工具的核心调用，不是独立完整程序：`source` 为当前输入，`config` 为已经加载的当前配置，`filename` 为当前虚拟文件。所有修复都只覆盖规则提供的可修复问题，不保证修复所有诊断。

### ESLint

普通浏览器路线使用 `Linter`，提前加载可在浏览器消费的配置、解析器和插件：

```js
import { Linter } from 'eslint'

const linter = new Linter()
const { output, messages, fixed } = linter.verifyAndFix(
  source,
  config,
  { filename },
)
```

`output` 是修复后的文本，`messages` 是剩余诊断，`fixed` 表示是否执行了修复。模块的浏览器打包方式仍需另行配置。

本方案在 WebContainer 中使用完整 Node.js 配置加载能力：

```js
import { ESLint } from 'eslint'

const engine = new ESLint({
  // true 禁止自动查找磁盘配置，由下面的 overrideConfig 明确提供配置。
  overrideConfigFile: true,
  // 将共享工厂生成的配置传给 ESLint 实例，不依赖当前进程目录的配置发现。
  overrideConfig: await config,
  // 启用自动修复；只处理规则实际提供的修复，仍须检查剩余诊断。
  fix: true,
})
const [result] = await engine.lintText(source, {
  // 为 ESLint 字符串输入提供文件路径语境，决定配置匹配和解析器选择。
  filePath: filename })
const output = result.output ?? source
const messages = result.messages
```

这里返回文本供页面预览，不调用 `ESLint.outputFixes()` 写回用户项目文件。

### Stylelint

```js
import stylelint from 'stylelint'

const result = await stylelint.lint({
  // 传入待检查的源码字符串，而非让 API 从磁盘查找文件。
  code: source,
  // 为字符串输入提供文件路径语境，使解析器和文件覆盖按扩展名生效。
  codeFilename: filename,
  config,
  // 启用自动修复；只处理规则实际提供的修复，仍须检查剩余诊断。
  fix: true,
})
const output = result.code ?? source
const messages = result.results.flatMap(item => item.warnings)
```

`result.code` 在传入 `code` 且启用修复时提供修复文本，剩余问题从各文件结果读取。正式实现还须处理解析错误、无效选项、忽略状态和配置异常，不能只看 warnings 数量。官方在线演示的 WebContainer 架构见[演示 README][stylelint-demo-md]。

### Markdownlint

Node.js / WebContainer 的原生库调用：

```js
import { applyFixes } from 'markdownlint'
import { lint } from 'markdownlint/promise'

const results = await lint({
  // 按虚拟文件名提供 Markdown 字符串，不扫描磁盘文件。
  strings: {
  // 读取当前虚拟文件对应的诊断列表，供实际修复函数消费。
  [filename]: source }, config })
const output = applyFixes(source, results[filename])
const remaining = await lint({
  // 按虚拟文件名提供 Markdown 字符串，不扫描磁盘文件。
  strings: {
  // 读取当前虚拟文件对应的诊断列表，供实际修复函数消费。
  [filename]: output }, config })
const messages = remaining[filename]
```

`applyFixes()` 使用诊断中的修复信息处理文本，不负责加载配置或再次检查。本仓库当前通过 CLI2 正式转导出路径 `markdownlint-cli2/markdownlint` 与 `markdownlint-cli2/markdownlint/promise` 使用同一引擎能力。当前验证版本 0.42.0 的 `applyFixes` 从主模块导出，不从 helpers 导出。

## 页面与交互

页面主体采用配置、源码、结果三个工作区，优先保证代码编辑空间。窄屏按任务切换工作区，保留各自输入、结果和当前位置。

- 顶部：选择工具、虚拟文件及支持的文件类型，展示当前基础包与运行状态。
- 配置区：编辑完整配置及规则参数，支持恢复示例、复制和下载。规则检索与详情可辅助插入或修改配置，但不能维护另一份独立可写的规则状态。
- 源码区：可编辑示例、恢复示例，执行“运行检查”或“自动修复”。工具和文件切换时保留各自草稿。
- 结果区：展示诊断级别、规则、说明、行列位置；点击诊断定位源码。不能将配置加载失败、引擎异常、文件忽略或不支持显示成检查通过。
- 修复区：展示修复前后差异与剩余诊断；用户明确应用后替换源码，允许再次检查。不能把建议性修改冒充自动修复。
- 导出：导出当前完整配置，明确其是否已经按当前源码和输入版本成功执行；不能只导出筛选后的规则。

规则编辑须保留工具语义。例如 ESLint 的继承与显式关闭不同，Stylelint 的规则主参数和 severity 不等同于 ESLint 的级别数组，Markdownlint 的布尔开关和对象参数也应原样保留。

无效配置保留输入并展示真实错误；输入变化后将旧结果标为过期。运行中防止重复执行，提供取消和超时处理，取消只作用于所属进程。重启沙箱前保护草稿，不让旧操作释放新操作的锁或写入新结果。

## 目录与依赖设计

新结构按实际职责划分为页面、业务状态、浏览器沙箱控制、沙箱内引擎执行和构建数据准备。下列目录是目标结构，按实际实现创建，不提前生成空目录或占位文件。状态层采用 Pinia；目录按实际职责创建，具体实现与验证状态见执行记录。

```text
playground/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router.ts                 # 六个主视图、地址及返回位置
│   ├── layouts/
│   │   └── Workbench.vue         # 工具切换、导航、当前草稿与引擎状态
│   ├── views/
│   │   ├── overview/
│   │   │   ├── index.vue         # 配置顺序、声明及匹配条件
│   │   │   └── components/       # 配置展开与详情，仅在职责需要时拆分
│   │   ├── rules/
│   │   │   ├── index.vue         # 插件、状态筛选及规则目录
│   │   │   └── components/       # 来源链、参数编辑等页面私有内容
│   │   ├── files/
│   │   │   └── index.vue         # 虚拟路径、忽略与最终配置
│   │   ├── experiment/
│   │   │   ├── index.vue         # 配置、源码、诊断与修复编排
│   │   │   └── components/       # 实验私有的诊断列表、操作区
│   │   ├── stats/
│   │   │   └── index.vue         # 规则分布与正式引擎性能数据
│   │   └── setup/
│   │       └── index.vue         # 安装、导出配置和接入命令
│   ├── stores/
│   │   ├── index.ts             # 只导出领域公开入口
│   │   ├── config/
│   │   │   ├── index.ts         # 只导出配置领域公开接口
│   │   │   ├── store.ts         # 工具、草稿、版本、匹配及配置解析
│   │   │   ├── catalog.ts       # 工具声明、目标与接入资料，构建时复用
│   │   │   ├── types.ts         # 领域自身的模型，不复制引擎契约
│   │   │   └── editing/         # 各工具配置编辑与序列化的真实差异
│   │   │       ├── eslint.ts
│   │   │       ├── stylelint.ts
│   │   │       └── markdownlint.ts
│   │   └── experiment/
│   │       ├── index.ts         # 只导出实验领域公开接口
│   │       ├── store.ts         # 文件草稿、运行、取消、结果及修复应用
│   │       └── types.ts
│   ├── components/
│   │   ├── editor/              # 配置与源码共用的编辑器 UI
│   │   │   ├── index.vue
│   │   │   └── types.ts
│   │   └── diff/
│   │       └── index.vue        # 修复与配置变更的共用差异 UI
│   └── sandbox/
│       ├── client.ts           # SDK 生命周期、准备状态、请求与取消
│       └── assets.ts           # 挂载服务、安装依赖并等待就绪
├── sandbox/
│   ├── index.ts                # 沙箱内请求分发与失败响应
│   ├── eslint.ts               # 加载完整配置、解析、检查、修复及性能
│   ├── stylelint.ts            # Stylelint 正式能力适配
│   └── markdownlint.ts         # Markdownlint 正式能力适配
├── protocol.ts                # 浏览器与沙箱的纯数据通信契约
├── types.ts                   # 构建元数据契约，按现有公开语义收敛
├── scripts/
│   ├── index.ts               # 构建准备流程入口
│   ├── metadata.ts            # 生成可静态浏览的规则与配置元数据
│   └── runtime.ts             # 准备服务文件与当前共享包产物
├── public/
│   └── _headers               # 生产跨源隔离响应头
├── tests/
│   ├── config/                # 配置编辑、解析与往返一致性
│   ├── experiment/            # 执行归属、取消、过期结果和修复
│   ├── sandbox/               # 三个工具真实引擎回归
│   └── browser/               # 静态产物下的浏览器端到端验证
├── uno.config.ts              # reset、字体、图标与原子样式
├── vite.config.ts
└── 方案.md
```

### 状态归属

配置领域是配置内容的唯一写入者，统一管理当前工具、完整配置源码、输入版本及引擎解析结果。总览、规则目录、文件匹配和导出消费同一领域，不各自维护可写副本。筛选、展开和列表布局等纯页面状态留在对应视图；返回位置由路由或页面存活策略保留。

实验领域按工具与文件管理源码、诊断、修复预览及性能结果。每次运行绑定配置版本、源码版本和目标文件；配置修改后旧诊断可以保留，但必须标记过期。性能视图消费实验领域的正式执行结果，不再建立一套执行器。

配置领域不依赖实验领域。实验执行读取配置领域当前版本；业务领域调用浏览器 sandbox client，client 不反向导入 Store。应用布局持有共享沙箱的生命周期，页面切换不销毁共享实例，取消操作只终止自身执行。

### 两侧执行边界

`src/sandbox/` 是浏览器 SDK 代码；根级 `sandbox/` 是交给 WebContainer 的 Node.js 执行代码。两侧仅共享 `protocol.ts` 的纯数据类型，不交叉导入实现。引擎与插件不能因客户端导入链进入普通浏览器包，Node 执行器也不依赖 Vue、Pinia 或页面。

`scripts/metadata.ts` 与 `scripts/runtime.ts` 分别准备静态浏览资料和实际执行资源，不成为第三套引擎实现。能复用沙箱内正式引擎加载及解析逻辑时直接复用；仅因执行环境不同而产生的资源装载差异才各自保留。

### 编辑与来源边界

`stores/config/editing/` 负责配置编辑模型和源码序列化，根级 `sandbox/` 负责执行与正式解析，两个目录不重复实现规则含义。配置源码与可视化编辑必须建立明确的可编辑语法范围；遇到任意 JavaScript、动态导入或无法保真的表达式时保留源码并限制相应表单编辑，不覆盖未知内容或强行双向转换。

三个工具沿用各自正式配置语义。ESLint 的有序配置片段、Stylelint 的 extends / overrides 和 Markdownlint 的继承及布尔或对象参数不能被扁平化成同一套虚构覆盖链。引擎未公开的来源保持未知。

### 页面与复用边界

配置、规则、文件、实验、统计和接入分别使用独立路由，一级导航支持地址直达和浏览器前进后退。实验页的编辑与反馈留在同一工作区：左侧配置，上方右侧 Monaco 原始源码与修复结果，下方真实诊断与 xterm Console 并排展示；桌面端不通过标签切换这些互补信息。窄屏按配置、代码和结果切换工作区域，结果区内诊断与 Console 纵向同时保留。点击诊断定位对应代码，并在当前配置区显示其规则；修改配置后结果标记过期，重新运行后更新。编辑器运行时按需加载，避免规则浏览等独立页面加载编辑器内核。

工作区匹配与性能执行结果由实验领域按工具分别保存，身份绑定配置及完整工作区内容，不含当前预览文件选择。选择已匹配文件时使用该文件的实际最终规则；内容修改后保留历史结果并提示重新解析。配置总览先展示摘要，详情首次展开时才挂载，展开后的局部披露状态保留。

视图入口使用所属目录的 `index.vue`，只负责路由、交互编排和界面生命周期。页面独有的详情、筛选和诊断展示就近维护；编辑器与差异视图因存在真实跨页面消费者，放在 `src/components/`，通过 props、事件与插槽交互，不直接读取业务 Store。

简单页面不为目录对称强拆组件。图标直接使用 UnoCSS 类，不创建图标组件或第二份图标映射；不恢复全局 styles 目录，不增加无实际消费者的 utils、services 或 composables 层。模块入口只导出，业务逻辑留在实现文件。

## 静态部署与依赖

生产页面使用 HTTPS，配置跨源隔离所需响应头：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Cloudflare 静态托管通过 `_headers` 配置，开发及预览也须设置对应响应头；最终以实际响应和 `crossOriginIsolated` 验收。SDK 持有的通信 iframe 和资源节点须在组件更新中保留，资源由实际持有者释放。

顶部只展示工具包、运行状态和沙箱操作，不放置跨页面的预览文件控件；文件页以目录定位文件，代码实验在编辑区选择示例、导入文件或自定义路径。当前工具服务导入后，仅以共享默认配置解析首次所选文件类型，再发出就绪握手；启动不执行示例检查或自动修复。默认配置与示例内容分别由配置目录和实验示例模块唯一维护，运行器生成阶段直接读取。配置准备不替代用户检查；自定义规则和额外插件仍按实际请求执行。

共享包应使用当前仓库构建产物，避免站点快照与注册表发布版本不一致。按现成演示的安装流程执行，直接依赖固定为构建环境中的版本，构建阶段由隔离的 pnpm 8.15.6 解析并生成各工具锁文件；浏览器按 --frozen-lockfile 安装固定的传递依赖，不现场重新解析依赖树。构建锁文件的 pnpm 版本匹配 WebContainer，仓库工程继续使用原有 pnpm 12。首次准备要求注册表可访问，不再发布完整 node_modules 快照。每个工具分别生成服务文件与依赖清单，当前路由工具优先安装并启动，就绪后顺序后台准备其他工具；独立目录避免 pnpm 改写其他工具的依赖；同工具准备 Promise 与常驻服务在会话内缓存，工具切换后复用。WebContainer 内执行引擎与包管理器，页面只处理小型服务文件和结果，不额外将大依赖树传递给页面 Worker。刷新后的依赖使用官方 `WebContainer.export(mode, { format: 'binary' })` 与 `mount(binary, { mountPoint: mode })` 恢复。缓存按工具服务文件（含源码与直接依赖版本）SHA-256 标识，使用 CompressionStream / DecompressionStream 压缩二进制并存入 Cache Storage。导出在沙箱侧完成，不把依赖树转成页面 JSON；临时用户配置模块不导出。新缓存保存成功后清理同工具旧版本；缓存写入失败只记录原因，不中断已就绪的服务。首次准备失败要能查看原因、保留输入并重试，准备成功后复用沙箱，避免每次检查重新安装。

WebContainer 不支持原生 Node 扩展。依赖中的原生能力、WASM 或 JavaScript 替代路径须逐项实测，不能静默删除插件或规则制造通过。浏览器兼容性、第三方资源策略、首次加载成本及商业生产使用许可须按实际部署条件核对。

## 后台准备与操作契约

### 后台工具资源预加载

进入任一工具路由后先完成当前工具安装与服务启动，再顺序准备其他工具的资源、缓存、依赖、引擎服务和当前文件类型配置。前后台共享同工具安装与启动 Promise，不重复下载或启动。后台不执行用户源码检查和自动修复。切换工具时复用已就绪服务；失败显示日志，后续前台可重试。此方案减少后续切换时的联网和加载等待，但会占用网络与沙箱资源。

### 工具路由与准备入口

采用 `#/:tool/:page`，tool 限定 eslint、stylelint、markdownlint，page 保留六个工作区。工具导航和跨页链接保留工具参数；无前缀旧页面重定向到 ESLint 对应页面并保留查询。工作台监听工具路由，先选择对应配置，再读取元数据并准备引擎。配置 Store 不在构造时默认请求 ESLint 元数据，实验页不重复持有初始化入口。当前工具就绪后继续沿用后台资源准备流程。

### 接入导出与沙箱操作

接入脚本按工具命名为 lint:<工具名>、format:<工具名>，修复复用检查脚本并追加 --fix。ESLint 和 Stylelint 导出 .mjs，命令与实际导出文件名一致；Markdownlint 导出 markdownlint-cli2.mjs 并用 --config 显式指定，CLI2 config 保存规则，扫描、Git 忽略与路径忽略位于外层。普通文件名避免浏览器下载移除前导点；源码规则覆盖写入导出 config。

缓存清理属于沙箱工具栏，与重启沙箱并列。仅清理工作台管理的持久化文件系统缓存，保留当前服务与草稿，等待已经开始的写入后清理，本页面会话暂停后续缓存写入。Console 提供复制完整日志、清空日志及复制状态。

WebContainer 内各工具使用自身 .pnpm-store，保证首次安装均触发内置 pnpm 的依赖预填充，避免共享存储非空时 remoteTarball 抛出 Invalid package。二进制缓存不包含临时配置和 pnpm 存储目录，保留服务所需 node_modules 与共享配置包。

### 工作台信息与操作层级

总览展示配置声明数、启用规则、启用且可修复规则和草稿改动，并标明快照或实际解析来源。文件页展示当前范围及上次匹配摘要，解析前后均可搜索，文件与分组详情展开时才挂载。规则筛选提供可访问选中状态、一键重置和页内数量；切换工具恢复适用的筛选条件，同工具内切页保留筛选。文件规则和性能排行跳转携带目标规则查询，避免旧筛选挡住目标。Stylelint、Markdownlint 的性能页优先展示实际可用的文件维度。六页操作与状态采用本地 Lucide 图标，图标保留文字或可访问名称。

公共上层右侧按清理沙箱、重置沙箱、重启沙箱排序，分别清除持久化缓存、重装当前工具依赖、复用依赖重启进程。三者保留编辑内容；重装先说明联网和作用范围再确认。编辑器下层左侧仅展示文件信息，右侧放恢复初始代码、重命名文件、检查代码、预览修复。恢复仅影响当前代码，保留配置并支持取消；重命名保留内容，不覆盖已有路径。

### ESLint 首次配置预编译

ESLint 的主要冷启动成本来自上游共享配置及静态插件的 ESM 模块加载。构建阶段使用根项目现有 tsdown 将已安装版本的静态依赖预编译为 CommonJS；动态语言插件、共享 composer、类型 API 和依赖相对资源定位保持原生模块边界，不删减规则。

只有发布到浏览器的共享包副本引用预编译入口，原始包源码和消费方导出配置保持原样。沙箱启动时将 CJS 资源放入原上游包的目录上下文，确保外部依赖按原路径解析。需要相对数据文件的 CSS 解析依赖通过虚拟运行项目显式声明，不向消费项目增加另一套规则或配置 API。原始资源随二进制缓存保留，派生副本不重复缓存。

运行资源原文约 5 MB，增加了静态资源体积，不能只看模块计时宣称任意网络环境总耗时固定下降。预编译方案须同时验证六种 ESLint 文件的最终规则、诊断、忽略状态和修复文本一致，再验证浏览器的首次准备、缓存恢复、重启与重装。ESM 预打包无收益时不采用，不把准备工作挪到用户检查后面制造数字改善。

## 参考图重设计与功能保留

参考图用于布局与信息层级，不作为功能删减清单。配置总览、规则目录、文件匹配、代码实验、统计与性能、项目接入继续使用顶部一级导航和独立路由；插件列表、规则详情与接入步骤是页面内辅助面板，不替代一级导航。

主题直接引用 Docs 的 VitePress variables.scss，品牌色只用于主操作与选中态，正文使用中性背景、卡片、边框和文字层级；明暗状态由工作台唯一持有并只读提供给图表。字体与图标继续由 UnoCSS 管理，不复制图标映射或增加全局 styles 目录。

| 页面 | 布局与交互 | 保留范围 |
| --- | --- | --- |
| 总览 | 四张摘要卡、可筛选配置列表、规则状态环图、后续工作入口 | 原始条件/忽略/插件/运行选项/规则声明、原生路径匹配、逐项与全部展开 |
| 规则 | 顶部插件／使用情况／规则状态三组点选筛选及图标，下方列表或卡片与详情 | 全部筛选/分页、级别/完整 JSON 覆盖、Schema/默认参数、来源与官方文档 |
| 文件 | 紧凑导入与摘要、左侧真实目录/列表/分组、右侧全量配置/规则到文件的匹配关系及原文详情，可调整分栏 | 原文导入与重导入、忽略/不支持状态、最终规则与配置跳转、展开/收起 |
| 实验 | 宽屏左配置、中间差异编辑、右诊断与 Console；窄屏使用原有切换 | 可视化/完整源码、重命名/恢复、检查/取消、修复预览/明确应用、诊断定位、完整日志 |
| 统计 | 执行摘要、真实耗时环图、可点击 Top 10 图、完整可检索排行 | 原引擎细分数据与数值图例、规则/插件/文件/任务排行、过期状态与元数据分布 |
| 接入 | 步骤导航、逐步配置与脚本、下载摘要卡 | 三包原生接入契约、完整导出、命令复制、正式文档与未验证提示 |

图表使用 vue-echarts 与 Apache ECharts，按页面懒加载，只注册 SVG、环图、条形图及必要组件。图表与列表读取同一份 Store 派生数据，不保存可写副本。静态规则分布明确标注发布快照或当前解析与实际目标文件；性能图仅在真实执行后展示。缺少细分数据时显示说明和实际文件耗时，不制造模拟时间。点击排行图进入对应规则或文件，任务保留其原文件上下文；完整明细、搜索及分批展开继续可用。

### 交互组件与工作区布局

交互原语使用 Reka UI 2.11，通过 unplugin-vue-components 的官方 RekaResolver 自动导入；组件声明由插件生成，业务组件保持显式导入。职责与状态仍属于原配置 Store、实验 Store 和沙箱客户端，组件不建立第二份配置或文件内容。

| 场景 | Reka UI 能力 | 行为 |
| --- | --- | --- |
| 顶部工具与页面导航 | NavigationMenu | 以 NavigationMenuLink 的 as-child 组合 RouterLink，保留独立路由、活动状态与键盘导航 |
| 文件与规则快捷操作 | ContextMenu | 右键文件查看匹配、复制路径或进入实验；右键规则查看详情、复制名称或进入实验，可见入口始终保留 |
| 面板长内容 | ScrollArea | 文件目录、匹配详情、规则列表、配置区与诊断独立滚动；Monaco 和 xterm 保留自己的滚动机制 |
| 文件及属性选择 | Select | 统一主题弹层、键盘选择、Esc 关闭与焦点恢复 |
| 配置编辑与移动工作区 | Tabs | 配置源码和可视化编辑分区；窄屏切换配置、代码、结果 |
| 语言集成及匹配条件 | Switch、Checkbox | 直接读写原有配置选项与匹配筛选 |
| 插件、使用范围、文件展示及性能维度 | ToggleGroup | 单选和方向键导航，重复点击保留当前有效筛选 |
| 文件目录 | Tree | 保留导入目录相对路径，目录优先排序，搜索展开父目录；单击原地查看匹配，明确操作才进入实验 |
| 恢复配置、恢复代码及重装 | AlertDialog | 说明覆盖范围，支持取消、确认与焦点恢复 |
| 配置导出及运行状态 | DropdownMenu、Popover | 任意页面导出默认或实验配置；查看三个工具真实状态 |
| 操作反馈和辅助提示 | Toast、Tooltip | 复制、缓存及错误反馈；鼠标和键盘均可查看提示，不叠加相同的页脚通知 |
| 准备或执行等待 | Progress | 无可靠总量时使用不确定进度，不推算下载百分比或把失败显示为完成 |
| 项目接入 | Stepper | 非线性阅读导航，步骤不代表用户本机已经完成安装或检查 |
| 长列表、折叠内容 | Pagination、Accordion、Collapsible | 规则目录与文件页的全量规则使用正式页码组件；配置卡片、文件分组及参数按需披露；规则分页完整排版本页各行，不用固定高度截断末行 |
| IDE 面板 | Splitter | 嵌套配置／编辑、编辑／结果、诊断／控制台分栏，支持拖动、方向键、配置区与控制台折叠、刷新恢复尺寸、还原布局和整体高度调整 |

沙箱客户端以单一阶段和消息对象发布实际状态，顶部与状态详情共用呈现：灰色未初始化、琥珀色准备或取消、绿色就绪、品牌色依赖已准备或执行中、红色失败；同时显示不同图标及具体文字，不依赖文案推断阶段。文件页以当前工作区为浏览范围；旧结果明确标记过期，新导入文件显示待解析；右侧完整展示配置与规则目录，展开任意项反查匹配文件及各文件原生值，当前文件只作为定位高亮。未解析、未匹配、关闭规则及引擎未公开的匹配链分别表达；目录可搜索并分页，不因当前文件或忽略状态删减。构建期按工具合并全部支持类型的规则定义为 catalog.json，配置领域只加载当前工具并缓存，以免 CSS／SCSS 等文件切换缩减规则范围。

只读配置对象、默认参数及规则值使用按需加载的 Shiki 高亮，共享 JSON／JavaScript 语言和明暗主题，使用 JavaScript 正则引擎。配置总览点击规则名称直接打开带图标的 Popover，不额外放置三点菜单；实际配置与规则默认参数分别置于 Tabs 内，规则行不重复显示配置值。配置摘要统一显示图标、名称与数量，文件条件、忽略条件、选项、插件和规则不再只有图标。可修复、推荐、废弃由统一组件在独立属性列以图标与文字呈现。规则详情分别展示共享配置快照／当前实际配置与上游公开的默认参数，不将配置值称作规则默认值；覆盖组以实际值驱动选中颜色，不重复显示继承文字。

一级导航保持独立路由和顶部位置。IDE Layout 使用官方 Splitter 组合方式，不引入另一套编辑器或文件状态。样式继续读取 Docs 主题；选择弹层的主题规则限定在工作台容器内，以兼容 Portal 的节点归属。

一手参考：[官方组件目录](https://reka-ui.com/llms.txt)、[Tree](https://reka-ui.com/docs/components/tree)、[Toast](https://reka-ui.com/docs/components/toast)、[Progress](https://reka-ui.com/docs/components/progress)、[Stepper](https://reka-ui.com/docs/components/stepper)、[Splitter IDE Layout](https://reka-ui.com/examples/splitter-ide-layout)、[NavigationMenu](https://reka-ui.com/docs/components/navigation-menu)、[ContextMenu](https://reka-ui.com/docs/components/context-menu)、[ScrollArea](https://reka-ui.com/docs/components/scroll-area)、[Pagination](https://reka-ui.com/docs/components/pagination)、[自动导入安装说明](https://reka-ui.com/docs/overview/installation)。

## 验收条件

正式实现应覆盖三个工具及产品声明支持的文件类型，分别验证以下结果：

- 默认配置确实通过公开入口加载，最终配置与该虚拟文件匹配。
- 修改规则或参数后，目标诊断发生预期变化，无关诊断正常保留。
- 输入语法错误、配置错误、未知规则与不支持文件得到真实失败反馈。
- 自动修复返回真实源码变化，剩余不可修复诊断保留；应用后再次检查一致。
- 修改、切换、取消、重复点击和迟到响应不会串写草稿或结果。
- 导出配置可在约定环境消费，并与页面实际执行的配置一致。
- 构建产物在静态托管环境直接运行，无本地运行器、开发服务器业务 API 或检查后端。
- 桌面、窄屏、键盘操作、焦点和诊断定位可用；首次准备失败、超时及沙箱重启可恢复。

源码检查、浏览器行为、生产静态产物与 Cloudflare 线上访问分别验收，不相互替代。

## 验证依据：2026-10-25 隔离实验

本节是验证记录，证据标签仅用于区分已观察结果和待验证判断。

### 环境及结果

[已验证] 实验使用 WebContainer API 1.6.4、浏览器内 Node.js 22.22.3、本机服务提供的静态构建产物。三个共享包均为本次仓库构建产物，版本 1.0.5；直接依赖版本取自已安装包，传递依赖由沙箱安装时解析，未复现仓库完整 lockfile。

| 对象 | 验证输入 | 结果及证据范围 |
| --- | --- | --- |
| ESLint 10.13.0 | TypeScript；`no-console` 从 error 改为 off；`style/semi` 修复分号 | 原样运行在配置工厂失败；采用下述兼容处理后，目标诊断消失、格式诊断保留、修复源码去除分号 |
| Stylelint 17.16.0 | CSS；`color-no-invalid-hex` 从 true 改为 null；`color-hex-length: short` | 目标诊断消失，独立的 `declaration-property-value-no-unknown` 诊断仍保留；`#ffffff` 修复为 `#fff` |
| Markdownlint CLI2 0.24.0 / 引擎 0.42.0 | Markdown；MD009 从 true 改为 false；3 个尾随空格 | 目标诊断消失；`applyFixes()` 移除尾随空格 |

[已验证] 页面实际操作覆盖三个工具的检查与修复预览；Markdownlint 还验证了点击诊断定位、应用修复并再次检查；ESLint 在配置编辑器关闭 `no-console` 后重新检查，目标诊断消失。

### ESLint 运行时差异

[已验证] 此沙箱中的最小诊断输出为：

```text
Promise.resolve([]) instanceof FlatConfigComposer  => true
真实 composer instanceof FlatConfigComposer       => true
配置工厂错误：TypeError: other._defaultIgnores is not iterable
```

[已验证] 在该类显式使用标准实例判断后，普通 Promise 为 false，真实 composer 为 true，配置工厂生成 41 个配置片段，随后诊断、规则覆盖与修复测试通过：

```js
Object.defineProperty(FlatConfigComposer, Symbol.hasInstance, {
  // 提供该属性的实际实现；此兼容示例复用原生 hasInstance，而非重新实现类型判断。
  value: Function.prototype[Symbol.hasInstance],
})
```

[已验证] 实验只在检测到该异常判断时启用适配，不改写第三方文件、不删除规则与插件。该处理是特定运行环境下的验证适配，不代表 ESLint 当前配置能够在 WebContainer 内无条件原样运行。

[推测] 该差异与沙箱 Promise 实现有关；具体上游责任、后续 SDK 或运行时版本是否仍需适配，尚未核实。正式实现应保留最小复现并验证版本适用性，不将此补丁无说明地固定为长期实现。

### 原始材料与复现范围

[已验证] 本次实验材料保存在仓库 `.tmp/playground/research/webcontainer/`：`verify.mjs` 保存断言，`runtime.mjs` 保存兼容处理，`results.json` 保存原样失败及兼容后通过的结果，`browser-evidence.json`、`ui-evidence.json` 保存执行及界面证据，`eslint.png` 保存修复界面截图。这些文件属于临时材料，本文已固定关键输入、输出与限制，不将临时服务在线状态作为长期证据。

[已验证] 尚未集成正式 Playground，未发布；Vue、SCSS、HTML、JSON、YAML、TOML、完整插件集、类型感知检查、多文件、Safari、Firefox、手机及 Cloudflare 线上产物均未验收。依赖快照、首次加载优化、超时取消和故障恢复仍属于正式实现要求。

[推测] 实验结果支持继续采用统一 WebContainer 方案，但不足以宣称完整产品已完成或所有配置均兼容。

### 一手来源

- [Stylelint 官方演示源码][stylelint-demo]：README 明确说明通过 WebContainer 内的 Node.js 进程调用 Stylelint。
- [ESLint Node.js API][eslint-api]：说明浏览器应使用 `Linter`、它不加载配置文件，以及 `lintText()`、`fix` 和 `verifyAndFix()` 的用途与结果；[官方 Markdown 源文件][eslint-api-md]。
- [Markdownlint 官方 README：Browser][markdownlint-browser]及[Fixing][markdownlint-fix]：说明浏览器构建、`lintSync()` 和 `applyFixes()`；[官方 README.md][markdownlint-md]。
- [Stylelint Node.js API][stylelint-api]：说明 `fix: true` 与修复结果 `code`；[演示官方 README.md][stylelint-demo-md] 说明 WebContainer 执行方式。
- [WebContainer 启动指南][quickstart]、[响应头配置][headers]、[原生扩展限制][troubleshooting]、[浏览器支持][browsers]及[商业使用说明][license]。

[stylelint-demo]: https://github.com/stylelint/stylelint-demo
[eslint-api]: https://eslint.org/docs/latest/integrate/nodejs-api
[quickstart]: https://webcontainers.io/guides/quickstart
[headers]: https://webcontainers.io/guides/configuring-headers
[troubleshooting]: https://webcontainers.io/guides/troubleshooting
[browsers]: https://webcontainers.io/guides/browser-support
[license]: https://webcontainers.io/enterprise

[eslint-api-md]: https://github.com/eslint/eslint/blob/main/docs/src/integrate/nodejs-api.md
[markdownlint-browser]: https://github.com/DavidAnson/markdownlint#browser
[markdownlint-fix]: https://github.com/DavidAnson/markdownlint#fixing
[markdownlint-md]: https://github.com/DavidAnson/markdownlint/blob/main/README.md
[stylelint-api]: https://stylelint.io/user-guide/node-api/
[stylelint-demo-md]: https://github.com/stylelint/stylelint-demo/blob/main/README.md
