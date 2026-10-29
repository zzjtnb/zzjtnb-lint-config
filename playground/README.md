# Lint Config Playground

浏览、编辑和验证 ESLint、Stylelint、Markdownlint 共享配置的纯静态工作台。三个真实引擎和共享配置在浏览器 WebContainer 中运行，无检查后端。页面目录来自构建时生成的元数据，修改后的结果来自实际引擎解析。

## 本地开发与构建

Node.js 与 pnpm 版本以仓库根配置为准。首次准备工作区或依赖清单变化时安装依赖；日常源码修改无需重复安装。从仓库根运行：

```bash
# 首次生成运行资源，再启动 Vite 监听工作台前端源码；不单独监听共享包。
pnpm --filter @zzjtnb/playground dev
```

开发和预览通过工作台自身 `.env` 的 `VITE_PORT` 设置端口，默认值为 3001，监听所有网卡。Playwright 读取同一环境配置；进程中的 `VITE_PORT` 可覆盖文件值，`PLAYWRIGHT_BASE_URL` 可单独指定测试地址。浏览器沙箱读取的是生成时复制的共享包与运行资源，不使用其他消费项目的 link 链接。修改共享包、生成器依赖或沙箱运行器后，需要重新生成工作台资料；这不是让所有外部消费项目重装依赖：

```bash
# 重新生成工作台规则元数据和各工具沙箱执行资源。
pnpm --filter @zzjtnb/playground generate
```

构建与预览：

```bash
# 构建工作台的生产产物。
pnpm --filter @zzjtnb/playground build
# 启动工作台已有生产产物的本地预览服务。
pnpm --filter @zzjtnb/playground preview
```

生成器通过三个公开配置包入口读取真实元数据。构建发布当前共享包产物、固定版本的依赖声明及工具级锁文件，ESLint 另带静态依赖的 CommonJS 预编译资源，不收集开发机整个 node_modules。输出位于 playground/dist，包含 metadata、runtime/eslint.json、runtime/stylelint.json、runtime/markdownlint.json 和页面资源，生成物不提交 Git。工程脚本的职责见[构建准备](./scripts/README.md)。

## 路由与页面

地址采用 Hash 路由，无需静态托管提供服务器路由回退。三个工具的首页分别为：

- ESLint：`#/eslint/overview`
- Stylelint：`#/stylelint/overview`
- Markdownlint：`#/markdownlint/overview`

工具导航保留当前工作区；刷新、前进后退按地址恢复工具。旧的无工具前缀地址跳转到 ESLint 对应页面，并保留查询参数。

| 页面 | 路径尾段 | 用途 |
| --- | --- | --- |
| 配置总览 | overview | 按顺序浏览配置声明、插件、文件条件、忽略项、解析器与规则；输入路径测试实际匹配 |
| 规则目录 | rules | 按插件、级别、属性和文本筛选；查看官方文档、原始来源和参数契约，编辑规则覆盖 |
| 文件匹配 | files | 导入文件或目录，全量配置／规则反查匹配文件，按匹配组合分组，进入对应文件实验 |
| 代码实验 | experiment | 编辑配置和源码，运行检查、预览修复、定位诊断、应用修复，查看和复制 Console 日志 |
| 统计与性能 | stats | 分析当前工作区，比较规则、插件、文件和任务耗时，搜索并分批展开排行，浏览规则元数据分布 |
| 项目接入 | setup | 安装依赖、导出完整配置、复制工具专属脚本和运行命令 |

### 配置和结果的边界

- 总览摘要明确标注发布快照或当前实际解析；原始声明的文件条件不能单独证明匹配。
- 规则目录的已配置、启用、显式关闭、可修复和已修改分别展示。上游缺少说明或属性时保留未知，不虚构数据。
- Stylelint 与 Markdownlint 不推断未公开的继承链或逐规则性能数据。Stylelint 解析配置时通过正式 lint API 的空输入取得忽略状态，不检查示例源码，也不自行复制忽略匹配算法。
- 每个工具独立持有配置源码、规则覆盖和文件输入。覆盖最后追加，不改写任意 JavaScript 表达式；动态语言选项需在源码编辑。
- 工作区仅包含沙箱示例或用户明确导入的文件，不主动扫描本机项目。当前工具不支持的文件单独列出，不作为已检查文件。同路径重新导入替换原文与编辑内容，清除导入后恢复示例预览和检查范围。
- 文件选择位于代码实验的“编辑文件”控件和文件页目录内；文件页以真实目录层级浏览导入路径，支持解析前后搜索与状态筛选；单击文件只更新定位；完整配置与规则可展开反查各自匹配文件、启用／关闭状态和实际值，文件信息提供原文预览，右键可复制路径或进入代码实验。
- 检查诊断保留真实级别和位置，支持搜索与级别筛选。输入变化后旧结果标记过期，不能定位新代码或应用旧修复。
- 自动修复先展示 Monaco 差异，点击“应用修复到源码”后才替换输入；不能自动修复的问题仍会显示。
- 文件匹配与工作区性能结果独立保存，单文件检查不会覆盖它们。配置、源码或导入范围变化时显示过期提示。
- 同工具内切页保留草稿和页面状态；切换工具时，规则目录恢复该工具适用的筛选条件。刷新会重置会话草稿，重要配置应先下载。

## 资源准备、沙箱和缓存

进入任一工具路由，先读取其元数据并准备该工具的服务文件、依赖和默认配置。首次安装完成后，加载完整共享配置与插件，再解析首次文件类型配置，不预执行示例检查和自动修复；这仍有一次性模块加载成本。当前工具就绪后，再顺序后台准备其他两个工具的资源、依赖、服务和默认配置；切换时复用已完成或正在进行的准备，不保证后台未完成时零等待。

上层右侧统一放置清理、重置、重启沙箱；下层编辑器右侧放置恢复初始代码、重命名文件、检查代码、预览修复。恢复代码只覆盖当前输入，支持先取消；导入文件恢复为原始导入内容，自定义文件恢复为同类型示例。重命名保留当前输入，拒绝覆盖已有路径、越界路径和当前工具不支持的扩展名。

沙箱区域的“三个工具准备状态”展示每个工具当前的真实阶段，Console 保留安装、启动、就绪、执行与失败日志。检查与修复按钮在当前工具准备期间不可用，输入仍可编辑。其他页面的批量分析也需等待准备完成。

三个工具共用一个 WebContainer，服务和依赖目录独立。各工具使用自己的 .pnpm-store，以避免 WebContainer 的内置 pnpm 在共享存储非空时跳过依赖预填充而触发 Invalid package。依赖与引擎执行在 WebContainer 中，不在页面线程解析完整依赖树。

构建时通过隔离的 pnpm 8.15.6 生成与 WebContainer 匹配的锁文件，仓库工程仍使用根配置中的 pnpm 版本。浏览器安装使用 --frozen-lockfile --ignore-scripts，跳过传递依赖解析；首次仍需联网获取依赖。后台准备会占用网络和沙箱资源。

安装后通过 WebContainer 官方二进制 export 接口导出工具文件系统，压缩存入 Cache Storage。刷新后资源 SHA-256 一致则直接 mount 缓存；缓存缺失、不可用或恢复失败会显示原因并正常安装。快照不包含用户临时配置模块和 pnpm 存储目录，也不保存诊断结果。ESLint 的原始预编译资源保留在快照中，启动时按原上游包的目录建立 CJS 加载上下文；派生副本不重复缓存。

### 沙箱操作

| 操作 | 实际作用 |
| --- | --- |
| 取消准备 | 停止当前工具的资源等待、依赖安装或服务启动，保留草稿与已安装依赖 |
| 重新准备 | 取消或失败后重新准备当前工具，复用有效的已安装依赖 |
| 重置沙箱 | 确认后删除当前工具的缓存与依赖，重新安装并启动，保留代码和配置草稿 |
| 重启沙箱 | 只重启当前工具检查进程，保留已安装依赖和所有草稿 |
| 清理沙箱 | 清理工作台保存的三个工具文件系统快照，不清理站点其他缓存，不停止当前服务 |
| 复制日志 | 复制完整日志，包括安装输出与错误堆栈；复制结果在 Console 显示 |
| 清空日志 | 只清空 Console，不重启服务，不清除检查结果 |
| 取消执行 | 停止当前操作，保留输入，下次操作可重新启动当前工具服务 |

准备流程最长等待 4 分钟，超时显示失败并允许重新准备；资源请求最长等待 2 分钟。Console 记录安装、缓存恢复、服务启动与总准备耗时，浏览器性能条目分别使用 `playground:<工具>:install`、`restore`、`startup` 和 `total`。损坏的压缩缓存会失效并回退安装，不将恢复失败当作准备成功。

清理缓存会等待已开始的写入，并暂停本页面会话的后续缓存保存，避免后台立即回填；刷新后恢复正常保存。检查执行超过 60 秒会终止进程并显示超时，不能把超时或被忽略文件视为检查通过。

配置模块会在沙箱执行，示例程序只用于检查，不作为程序运行。ESLint 配置通过兼容适配在 WebContainer 中加载，保留完整规则和消费方覆盖。

## 带回真实项目

接入页依据当前工具生成安装命令、配置和命名脚本。请合并到项目已有配置，保留其他工具脚本。自动修复不能替代项目全量检查。

| 工具 | 导出文件 | 检查 / 修复脚本 |
| --- | --- | --- |
| ESLint | eslint.config.js | lint:eslint / format:eslint |
| Stylelint | stylelint.config.js | lint:stylelint / format:stylelint |
| Markdownlint | markdownlint-cli2.mjs | lint:markdownlint / format:markdownlint |

ESLint 与 Stylelint 导出原生 ESM 配置。Stylelint 按样式 glob 扫描，不使用 stylelint .。修复脚本复用对应检查脚本并追加 --fix，保持文件范围与缓存参数一致。

Markdownlint 的导出为 CLI2 ESM 配置，规则位于 config，扫描和忽略设置位于外层。命令显式使用 --config markdownlint-cli2.mjs；这个普通文件名不依赖 CLI2 自动发现。已有同目录 .markdownlint.* 规则文件可能覆盖 CLI2 的 config，迁移时需合并规则来源。检查与修复共用配置不固定 fix，以保留 --fix 的操作区分。

正式消费契约分别见 [ESLint 包文档](../packages/eslint/README.zh-CN.md)、[Stylelint 包文档](../packages/stylelint/README.zh-CN.md)、[Markdownlint 包文档](../packages/markdownlint/README.zh-CN.md)。配置工厂参数、规则覆盖优先级及版本要求以对应包文档为准。

## 样式与图标

UnoCSS 统一维护 Wind4 reset、字体与 Lucide 图标。正文与等宽字体栈对齐 Docs，编辑器使用 GitHub Light 与 GitHub Dark Default 语法主题；Inter 使用 Google Fonts，无法连接时回退到系统字体。图标从本地集合构建为 CSS，不在运行时请求图标服务。图标用于区分导航、操作、状态和数据摘要，并保留文字或可访问名称。

工作台直接引用 Docs/VitePress 的主题变量，六个一级页面继续位于顶部导航。总览使用摘要卡、配置列表和规则分布；规则使用顶部三组图标筛选、列表／卡片与详情布局；文件页支持实际拖入文件与目录选择；宽屏实验页同时展示配置、差异编辑、诊断和 Console；接入页保留完整步骤与独立下载摘要。

图表使用 vue-echarts 8 与 Apache ECharts 6，版本统一维护在 pnpm catalog。仅注册 SVG、Pie、Bar、必要布局与辅助功能组件，并随使用图表的页面懒加载；直接打开代码实验不加载图表代码。生产构建把 Vue、运行时和 ECharts 分成独立分包，避免共享模块递归把图表代码带进实验页。图表与明细消费同一份真实数据，支持 Tooltip、图例与排行点击跳转；缺少细分数据时使用真实文件耗时并说明边界，原始列表、搜索与数值图例均保留。

页面专属 SCSS 随组件维护，共用布局样式由 layouts/Workbench.vue 持有，不另设全局 styles 目录。窄屏保留六个独立页面，实验区通过配置、代码、结果切换控制空间。交互层使用 Reka UI 的导航、树、标签页、对话框、菜单、滚动区域和分隔面板原语，状态与引擎逻辑归各自 Store 和沙箱模块。

## 静态部署与浏览器条件

生产须使用 HTTPS 并设置以下响应头；Cloudflare 使用 public/_headers，其他托管平台需配置同等响应：

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

浏览器支持、网络策略、原生扩展限制及商业许可见 [WebContainer 官方指南](https://webcontainers.io/guides/quickstart)。不支持的配置与扩展会显示失败，不静默换成其他规则。

## 验证

```bash
# 检查工作台的 TypeScript 类型，不输出编译产物。
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground typecheck
# 运行工作台的单元及契约测试，完成一次后退出。
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground run test:unit --run
# 运行工作台 Playwright 浏览器测试，需要匹配的服务与构建资源。
pnpm --config.verifyDepsBeforeRun=error --filter @zzjtnb/playground test:e2e
```

浏览器测试使用 e2e/ 中的用例，需要匹配的本地构建和正在运行的服务；测试期间不要并行替换该服务使用的构建产物。
