# 工作台构建准备

`generate` 先运行共享包 build 生成产物，再运行 `index.ts`，顺序生成元数据与服务文件。静态浏览元数据和浏览器执行资源分别准备，均通过公开配置包入口加载。

`build` 先完整执行 generate，再并行执行类型检查和 Vite 打包，避免生成步骤重建公开包 dist 时类型检查读不到入口。`build-only` 只运行 Vite，要求对应资料已生成。

- `metadata.ts` 输出 `public/metadata/` 的规则定义和预定义目标快照，并按工具合并全部支持类型的定义为 catalog.json；工具资料复用配置领域的 `src/stores/config/catalog.ts`。
- `lib/` 对接三个工具的元数据契约。ESLint、Stylelint 从 `catalog.ts` 的 `defaults()` 加载与沙箱相同的默认模块，临时模块只写入 `.tmp/playground/defaults/`，不执行浏览器用户草稿。ESLint 配置序列的展示数据与沙箱共用 `sandbox/config.ts`，保留文件、忽略、插件、语言选项、处理器和规则。
- `bundle.ts` 通过 Playground 自身声明的 tsdown 将 ESLint 上游的静态依赖预编译为 CJS，保留动态插件、composer、类型 API 和相对资源定位边界；不更改发布包源码，不删减规则。构建日志位于 `.tmp/playground/eslint-bundle/`。
- `manifest.ts` 将共享包清单的 dependencies、peerDependencies、optionalDependencies 中的 catalog 引用转换为已安装版本，保留可选 peer 和公开导出，并移除开发脚本与依赖，供不支持 catalog 的浏览器包管理器使用。
- `runtime.ts` 发布当前共享包构建产物、固定直接依赖版本、检查服务文件与 ESLint 预编译资源。浏览器共享包副本指向预编译入口，正式发布包不改写。通过隔离的 pnpm 8.15.6 生成与 WebContainer 版本匹配的工具级 pnpm-lock.yaml，连同服务文件分别输出。锁文件生成使用 .tmp/playground/lockfiles/ 下的独立项目，不向工作区引入旧 pnpm 命令。当前路由工具优先在 WebContainer 内安装并启动，就绪后顺序后台准备其他工具；各工具独立服务文件和 pnpm 存储，ESLint 服务文件不携带另外两个引擎；不收集开发环境的整个 node_modules。
- `utils/` 只负责生成阶段的包定位和工具元数据语义。

生成物由 Vite 静态发布，已被 Git 忽略。修改共享包源码、生成器依赖或沙箱运行器后重新执行 generate，将新构建产物复制到工作台运行资源。根 dev 的包构建监听只更新各包 dist，不自动刷新这些浏览器资源；此步骤不要求其他使用 link 的消费项目安装依赖：

```bash
# 重新生成工作台规则元数据和各工具沙箱执行资源。
pnpm --filter @zzjtnb/playground generate
```

浏览器不导入 Node.js 生成器或引擎实现。所有执行通过 `src/sandbox/` 的 SDK 控制完成，不提供本地检查 HTTP API。

## CLI2 类型适配维护

CLI2 转导出入口尚无正式声明，`lib/markdownlint-cli2.d.ts` 只声明工作台实际使用的契约，不额外安装底层 markdownlint。升级 CLI2 后运行工作台单元测试；`src/__tests__/sandbox/markdownlint.test.ts` 对照 CLI2 实际传递引擎的官方类型，并验证 JSONC、诊断和自动修复。CLI2 提供正式类型后，测试会提示移除本地适配，再以官方声明完成类型检查。
