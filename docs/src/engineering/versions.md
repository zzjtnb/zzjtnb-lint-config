---
navigation:
  text: 依赖版本管理
  group: engineering
  order: 10
---

# pnpm 统一管理依赖版本

pnpm 是 Node.js 包管理器；Catalog 将多个工作区采用的依赖版本范围集中声明，避免在各份 `package.json` 中重复维护。入门可查 [pnpm 官方文档](https://pnpm.io/)、[工作区说明](https://pnpm.io/workspaces)和 [Catalogs 教程](https://pnpm.io/catalogs)。Catalog 管理声明的版本范围，实际解析结果仍由锁文件记录。

本教程面向使用三个共享配置包的 pnpm Monorepo,说明如何将版本集中管理,同时保持各包的依赖归属.它使用 pnpm 原生 Catalog,不依赖本仓库内部工具,也不要求使用 Turborepo.

工作区目录、任务编排和缓存的完整搭建流程见 [Turborepo 与 pnpm](/monorepo)；本文集中说明依赖版本的声明与维护。

## 1. 先分清四种职责

| 文件或字段 | 维护什么 |
| --- | --- |
| 根 `pnpm-workspace.yaml` 的 `catalog` / `catalogs` | 主动选择的外部直接依赖版本,范围和别名 |
| 各包 `package.json` | 自己实际使用哪些依赖,以 `catalog:` 引用版本 |
| 根 `pnpm-lock.yaml` | pnpm 解析出的完整依赖树和完整性信息 |
| `engines`,`packageManager`,公开包 peer | 运行环境,包管理器版本和消费兼容契约,不是 catalog 的替代品 |

Catalog 维护主动选择的直接依赖版本；各项目声明自己的依赖，锁文件记录实际解析结果和传递依赖。

## 2. 在根工作区声明版本

已有 `pnpm-workspace.yaml` 时合并以下字段,保留原设置,不整文件覆盖:

```yaml [pnpm-workspace.yaml]
# 声明工作区项目路径；未匹配目录不会作为 pnpm 工作区参与依赖链接。
packages:
  - apps/*
  - packages/*

# 集中维护依赖范围，工作区通过 catalog: 引用。
catalog:
  # eslint 共享配置的示例版本范围，由工作区通过 catalog: 引用。
  '@zzjtnb/eslint-config': 1.0.5
  # stylelint 共享配置的示例版本范围，由工作区通过 catalog: 引用。
  '@zzjtnb/stylelint-config': 1.0.5
  # markdownlint 共享配置的示例版本范围，由工作区通过 catalog: 引用。
  '@zzjtnb/markdownlint-config': 1.0.5
  # JavaScript 与 TypeScript 检查引擎的版本范围；消费方通过 catalog: 引用，不在各包重复版本号。
  eslint: ^10.13.0
  # CSS、SCSS 与 Vue 样式检查引擎的版本范围；消费方通过 catalog: 引用，不在各包重复版本号。
  stylelint: ^17.16.0
  # Markdown 检查 CLI 及其公开转导出 API的版本范围；消费方通过 catalog: 引用，不在各包重复版本号。
  markdownlint-cli2: ^0.24.0
```

这是可复制的版本组合示例,不保证永远是最新版本.升级时核对共享配置包的正式消费范围,并同时检查实际安装结果;具体版本只修改所属 catalog 条目.

## 3. 根包引用 catalog

在根 `package.json` 中声明集中执行的检查工具:

```json [package.json]
{
  "private": true,
  "type": "module",
  "devDependencies": {
    "@zzjtnb/eslint-config": "catalog:",
    "@zzjtnb/stylelint-config": "catalog:",
    "@zzjtnb/markdownlint-config": "catalog:",
    "eslint": "catalog:",
    "stylelint": "catalog:",
    "markdownlint-cli2": "catalog:"
  }
}
```

### package.json 字段说明

上面的 package.json 示例使用严格 JSON，各字段用途如下：

| 字段 | 用途与生效条件 |
| --- | --- |
| `private` | true 禁止将示例或应用误发布到 npm；公开配置包不设置此开关。 |
| `type` | module 使项目的 .js 配置按 ESM 解析；非 ESM 项目改用 .mjs。 |
| `devDependencies` | 项目开发工具与共享配置依赖；生产业务代码不直接使用这些工具。 |
| `devDependencies.@zzjtnb/eslint-config` | 为此项目提供对应共享检查规则；版本范围由示例中的声明决定。 |
| `devDependencies.@zzjtnb/stylelint-config` | 为此项目提供对应共享检查规则；版本范围由示例中的声明决定。 |
| `devDependencies.@zzjtnb/markdownlint-config` | 为此项目提供对应共享检查规则；版本范围由示例中的声明决定。 |
| `devDependencies.eslint` | 对应工具的执行入口与 API；与共享配置声明的兼容范围配套安装。 |
| `devDependencies.stylelint` | 对应工具的执行入口与 API；与共享配置声明的兼容范围配套安装。 |
| `devDependencies.markdownlint-cli2` | 对应工具的执行入口与 API；与共享配置声明的兼容范围配套安装。 |
| `dependencies` | 运行或构建所需的直接依赖，必须由实际消费它的工作区声明。 |
| `dependencies.@robot/contracts` | 声明示例工作区实际消费的包；workspace: 协议只在仓库工作区内解析。 |

这只是需合并的字段,不应覆盖已有 scripts,engines,packageManager 或其他依赖.配置文件,修复命令和编辑器设置统一参见 [快速开始](/quick-start),不在各应用复制另一套规则.

根依赖不是所有包都可任意使用的"全局依赖".应用若独立执行某工具或打包时需要某包,应在所属清单直接声明;不能依赖偶然提升或其他包的 node_modules.

## 4. 应用与内部包分别怎么写?

例如,前端需要 Vue 时先在 catalog 增加已确认的 Vue 版本,再在前端包声明 `"vue": "catalog:"`.只把 Vue 加到根依赖并不能替代前端的直接声明.

内部契约包不是注册表依赖,使用 workspace 协议:

```json [package.json]
{
  "dependencies": {
    "@robot/contracts": "workspace:*"
  }
}
```

第三方包通过 catalog 引用版本，仓库内包通过 workspace 引用本地工作区；依赖方向仍由各项目职责决定。

## 5. 为不同工具保留兼容版本

工具需要不同 TypeScript 主版本时，可以通过命名 catalog 分别声明，由各消费工作区选择兼容范围：

```yaml [pnpm-workspace.yaml]
# 维护需要经典编译器 API 的工具版本。
catalogs:
  typescript6:
    # 仅供确实需要 TypeScript 6 API 的工具引用，不要求业务项目的编译器跟随降级。
    typescript: ^6.0.3
```

对应工具在自己的依赖中使用 `catalog:typescript6`。catalog 统一声明来源，不限制 `--latest` 升级范围。

## 6. 从分散版本迁移

1. 枚举根目录与实际工作区的 dependencies,devDependencies,optionalDependencies.
2. 同包出现不同范围时先核对实际兼容要求,不直接选择数字最大的版本覆盖全部.
3. 将确认要集中管理的外部版本移入 catalog，消费者改用 `catalog:`，保留依赖原先所属字段；开发依赖是否迁移由项目决定，不依赖 format 自动选型。
4. 内部包仍使用 `workspace:*`.有合理不同主版本需求时使用命名 catalogs,而不是强行全仓压成一个版本.
5. 在根运行 `pnpm install`,让 pnpm 更新锁文件;只同步依赖且不执行现有安装脚本时使用 `pnpm install --ignore-scripts`,但需另行安排确实需要的原生依赖构建.
6. 运行自动修复,只读检查,类型检查,测试及需要的构建,分别记录结果.

不要删除锁文件制造"干净安装",也不要手改其中的版本.CI 采用 `pnpm install --frozen-lockfile`,使清单与锁文件不一致时明确失败.

## 7. catalog,overrides 与 peer 的区别

- `catalog` 统一直接依赖的版本选择,不保证所有传递依赖只存在一份.
- `overrides` 改变依赖解析,只用于有证据的传递依赖约束;必须验证被约束消费者实际兼容,不能只是消除告警.
- 公开包 `peerDependencies` 声明承诺支持的消费方版本范围；应依据实际依赖要求和验证结果维护，不能仅根据开发机安装版本推断。
- 根 `engines` 描述仓库环境,公开包 engines 描述其自身消费要求,二者不应机械统一.

开发工具版本与公开包的消费范围分别维护。调整 peer 范围前，需要验证准备承诺的版本组合。

## 8. 验证集中管理是否真正生效

```sh
# 检查当前依赖的 peerDependencies 版本兼容性。
pnpm peers check
# 查看 eslint 的依赖来源及引入链。
pnpm why eslint
# 查看 typescript 的依赖来源及引入链。
pnpm why typescript
# 按当前项目配置自动修复代码、样式与文档，会写回文件。
pnpm run format
# 运行当前项目已配置的代码、样式和文档检查，不自动修复。
pnpm run lint
```

format/lint 名称应按消费项目的真实脚本配置.再执行所属项目的类型检查和测试.检查各清单是否仍重复写 catalog 中的版本,锁文件是否含 catalog 解析记录,CLI 与 API 实际加载是否正确.

有 peer 冲突时定位要求来自哪个包及适用范围,不把 ignored peer rules 当作修复.检查通过不等于所有声明版本范围均已实测,也不能替代原生环境,浏览器或硬件验收.

## 9. 后续日常维护

新增外部依赖:先定归属和兼容范围,在 catalog 增加条目,再由消费者引用并更新锁文件.移除依赖:先移除真实消费者,无其他消费者后再清理 catalog 条目.升级:修改唯一版本源,更新锁文件并验证受影响链路.

pnpm 的配置与命令按项目锁定版本核对,官方入口为 [Catalogs](https://pnpm.io/catalogs).

## 10. 预发布标签与可复现安装

`next` 是可变的注册表标签。版本范围由项目清单维护，实际安装版本由锁文件确定。

```bash
# 查询 VitePress next 标签对应的版本。
pnpm view vitepress@next version
# 查看文档站实际安装的 VitePress 版本。
pnpm --filter @zzjtnb/docs list vitepress
```

第一条查询现在标签指向哪里,第二条观察当前项目安装了什么;二者可能不同.不要因标签移动就绕过版本核对,也不要把 `^2.0.0-alpha.20` 称为精确锁定,精确解析由锁文件记录.

## 11. 依赖故障定位顺序

| 问题 | 核对入口 | 不应采取的替代措施 |
| --- | --- | --- |
| 子包找不到工具 | 子包清单与执行 CWD | 依赖根目录偶然提升 |
| CLI 与 API 版本不同 | `tsc --version` 与 `typescript.version` | 只看 catalog 字符串就声称一致 |
| peer 冲突 | 提出 peer 要求的直接消费者 | 用忽略规则隐藏不兼容 |
| lockfile 不一致 | 清单变更与安装结果 | 手改 integrity 或删除锁文件 |
| 本地通过 CI 失败 | pnpm 版本,Node,冻结安装与平台 | 在 CI 中自动升级全部依赖 |

升级应保留能复现的旧输入与失败信息,按受影响的配置包,Vue 工具和原生模块分别回归.通用 lint 通过不能证明二进制依赖,所有版本范围或生产部署已通过.

Catalog 自动修复参数及冲突策略以[官方规则源码](https://github.com/antfu/pnpm-workspace-utils/blob/main/packages/eslint-plugin-pnpm/src/rules/json/json-enforce-catalog.ts)与[官方测试](https://github.com/antfu/pnpm-workspace-utils/blob/main/packages/eslint-plugin-pnpm/src/rules/json/json-enforce-catalog.test.ts)为准。插件官方 README 标明 YAML 集成仍属实验功能；JSON 引用与 workspace 的变更需要一并检查，不把目录命名当成版本兼容性的判断。

工作区更新、冻结安装、存储清理及强制重装命令统一见 [Monorepo 常用维护命令](/monorepo#maintenance)。

## 12. TypeScript bridge 与预发布 peer 范围

采用 `typescript-native-bridge` 的消费项目，应区分实际兼容性与版本范围匹配。以 `6.0.3-bridge.19.tsgo.7.0.2` 为例，它带有预发布标识；即使基础版本高于 5.8，默认语义化版本匹配仍不会把它纳入 `@vue/tsconfig@0.9.1` 声明的稳定版范围 `>=5.8`。这类告警本身不能证明兼容，也不能据此要求整个工程降级编译器。

先核对实际安装的 bridge、直接消费者的 peer 声明，再执行消费项目的类型检查、构建与测试。只有确认对应组合可用时，才在消费项目的根 workspace 声明限定范围的兼容关系：

```yaml [pnpm-workspace.yaml（合并到已有配置）]
peerDependencyRules:
  allowedVersions:
    # 仅适用于此消费者与已验证的 TS 6.0.3 bridge 系列，不放行其他 TS 主版本。
    '@vue/tsconfig@0.9.1>typescript': '>=6.0.3-bridge.0 <6.0.4-0'
```

`allowedVersions` 是 pnpm 对已验证版本关系的补充声明，不修改包发布时的 peer 契约，也不会修复真实的 API 或语法不兼容。该示例不属于三个共享 lint 包的默认配置；未采用此 bridge 组合的项目不应照搬。升级消费者或 bridge 超出范围时重新验证，消费者的正式 peer 范围能够接受实际版本后移除这条声明。不使用全局 `allowAny: [typescript]` 或忽略全部 TypeScript peer 来掩盖问题。

```bash
# 更新安装结果并核对仍然存在的 peer 冲突；范围声明不能代替后续类型检查和运行验证。
pnpm install
pnpm peers check
```

pnpm 配置以当前版本的 [peerDependencyRules 官方说明](https://pnpm.io/settings#peerdependencyrules)为准。
