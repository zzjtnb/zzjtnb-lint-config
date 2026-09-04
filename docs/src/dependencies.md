---
navigation:
  text: 依赖版本管理
  group: engineering
  order: 10
---

# pnpm 统一管理依赖版本

本教程面向使用三个共享配置包的 pnpm Monorepo，说明如何将版本集中管理，同时保持各包的依赖归属。它使用 pnpm 原生 Catalog，不依赖本仓库内部工具，也不要求使用 Turborepo。

## 1. 先分清四种职责

| 文件或字段 | 维护什么 |
| --- | --- |
| 根 `pnpm-workspace.yaml` 的 `catalog` | 主动选择的外部直接依赖版本、范围和别名 |
| 各包 `package.json` | 自己实际使用哪些依赖，以 `catalog:` 引用版本 |
| 根 `pnpm-lock.yaml` | pnpm 解析出的完整依赖树和完整性信息 |
| `engines`、`packageManager`、公开包 peer | 运行环境、包管理器版本和消费兼容契约，不是 catalog 的替代品 |

**大白话**：catalog 是统一价目表，各应用只列自己需要的商品；锁文件是这次实际装到的完整清单。不是把所有传递依赖都搬进 catalog。

## 2. 在根工作区声明版本

已有 `pnpm-workspace.yaml` 时合并以下字段，保留原设置，不整文件覆盖：

```yaml
packages:
  - apps/*
  - packages/*

catalog:
  '@zzjtnb/eslint-config': 1.0.5
  '@zzjtnb/stylelint-config': 1.0.5
  '@zzjtnb/markdownlint-config': 1.0.5
  eslint: ^10.13.0
  stylelint: ^17.16.0
  markdownlint-cli2: ^0.24.0
```

这是可复制的版本组合示例，不保证永远是最新版本。升级时核对共享配置包的正式消费范围，并同时检查实际安装结果；具体版本只修改所属 catalog 条目。

## 3. 根包引用 catalog

在根 `package.json` 中声明集中执行的检查工具：

```json
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

这只是需合并的字段，不应覆盖已有 scripts、engines、packageManager 或其他依赖。配置文件、修复命令和编辑器设置统一参见 [快速开始](./quick-start)，不在各应用复制另一套规则。

根依赖不是所有包都可任意使用的“全局依赖”。应用若独立执行某工具或打包时需要某包，应在所属清单直接声明；不能依赖偶然提升或其他包的 node_modules。

## 4. 应用与内部包分别怎么写？

例如，前端需要 Vue 时先在 catalog 增加已确认的 Vue 版本，再在前端包声明 `"vue": "catalog:"`。只把 Vue 加到根依赖并不能替代前端的直接声明。

内部契约包不是注册表依赖，使用 workspace 协议：

```json
{
  "dependencies": {
    "@robot/contracts": "workspace:*"
  }
}
```

**大白话**：第三方包的版本去 catalog 查；自己仓库里的包直接连工作区。不把内部包伪装成注册表版本，也不让它反向依赖应用。

## 5. TypeScript 7 的双版本别名

只有需要 TS7 且工具仍依赖 TS6 编译器 API 时，才增加以下配置：

```yaml
update:
  ignoreDeps:
    - typescript
    - '@typescript/native'

catalog:
  '@typescript/native': npm:typescript@7.0.2
  typescript: npm:@typescript/typescript6@6.0.2
```

将它合并到现有 `update` 和 `catalog`，不要创建第二个同名 YAML 键。根 `devDependencies` 使用：

```json
{
  "@typescript/native": "catalog:",
  "typescript": "catalog:"
}
```

TS7 别名提供 `tsc`；`typescript` 别名提供兼容 API 与 `tsc6`。兼容包的发布版本与它内部报告的编译器版本不一定相同。子工作区需要 API 时也引用同一 catalog；需要独立使用编译器入口时直接声明相应 CLI 依赖，不能假设所有环境都从根回退解析。

```sh
pnpm exec tsc --version
pnpm exec tsc6 --version
```

两项别名成对核对，不通过升级单一条目破坏工具链。Vue SFC、NestJS 元数据和声明生成仍需按真实消费者验证。兼容机制说明与一手依据见 [ESLint 的 TS7 接入说明](./eslint#typescript-7-消费项目)。

## 6. 从分散版本迁移

1. 枚举根目录与实际工作区的 dependencies、devDependencies、optionalDependencies。
2. 同包出现不同范围时先核对实际兼容要求，不直接选择数字最大的版本覆盖全部。
3. 将统一后的外部版本移入 catalog，各消费者改用 `catalog:`，保留依赖原先所属字段。
4. 内部包仍使用 `workspace:*`。有合理不同主版本需求时使用命名 catalogs，而不是强行全仓压成一个版本。
5. 在根运行 `pnpm install`，让 pnpm 更新锁文件；只同步依赖且不执行现有安装脚本时使用 `pnpm install --ignore-scripts`，但需另行安排确实需要的原生依赖构建。
6. 运行自动修复、只读检查、类型检查、测试及需要的构建，分别记录结果。

不要删除锁文件制造“干净安装”，也不要手改其中的版本。CI 采用 `pnpm install --frozen-lockfile`，使清单与锁文件不一致时明确失败。

## 7. catalog、overrides 与 peer 的区别

- `catalog` 统一直接依赖的版本选择，不保证所有传递依赖只存在一份。
- `overrides` 改变依赖解析，只用于有证据的传递依赖约束；必须验证被约束消费者实际兼容，不能只是消除告警。
- 公开包 `peerDependencies` 是消费方兼容范围。开发时使用 ESLint 10.13 不意味着必须将 peer 下限从 10.4 提高到 10.13。
- 根 `engines` 描述仓库环境，公开包 engines 描述其自身消费要求，二者不应机械统一。

**大白话**：自己开发用最新版，不代表所有使用你配置的人都得升级；版本集中管理也不等于随便改兼容承诺。

## 8. 验证集中管理是否真正生效

```sh
pnpm peers check
pnpm why eslint
pnpm why typescript
pnpm run format
pnpm run lint
```

format/lint 名称应按消费项目的真实脚本配置。再执行所属项目的类型检查和测试。检查各清单是否仍重复写 catalog 中的版本，锁文件是否含 catalog 解析记录，CLI 与 API 实际加载是否正确。

有 peer 冲突时定位要求来自哪个包及适用范围，不把 ignored peer rules 当作修复。检查通过不等于所有声明版本范围均已实测，也不能替代原生环境、浏览器或硬件验收。

## 9. 后续日常维护

新增外部依赖：先定归属和兼容范围，在 catalog 增加条目，再由消费者引用并更新锁文件。移除依赖：先移除真实消费者，无其他消费者后再清理 catalog 条目。升级：修改唯一版本源、更新锁文件并验证受影响链路。

pnpm 的配置与命令按项目锁定版本核对，官方入口为 [Catalogs](https://pnpm.io/catalogs)。

## 10. 命名 catalog 的适用边界

默认 catalog 适合相同兼容线。确实有不同主版本消费者时，可维护命名 catalog，而不是用 overrides 强制压平：

```yaml
catalogs:
  tooling:
    typescript: npm:@typescript/typescript6@6.0.2
```

使用方对应写 `"typescript": "catalog:tooling"`。命名只表达真实版本边界，不按每个应用复制一份完全相同的 catalog。公开包 peer 仍描述消费兼容范围，不改成内部 catalog 协议。

## 11. 预发布标签与可复现安装

`next` 是注册表标签，不是不可变版本。本仓库文档站选择 VitePress 2 预发布线，当前 catalog 的版本范围与实际锁定版本分别由工作区清单和锁文件维护。

```bash
pnpm view vitepress@next version
pnpm --filter @zzjtnb/docs list vitepress
```

第一条查询现在标签指向哪里，第二条观察当前项目安装了什么；二者可能不同。不要因标签移动就绕过版本核对，也不要把 `^2.0.0-alpha.20` 称为精确锁定，精确解析由锁文件记录。

## 12. 依赖故障定位顺序

| 问题 | 核对入口 | 不应采取的替代措施 |
| --- | --- | --- |
| 子包找不到工具 | 子包清单与执行 CWD | 依赖根目录偶然提升 |
| CLI 与 API 版本不同 | `tsc --version` 与 `typescript.version` | 只看 catalog 字符串就声称一致 |
| peer 冲突 | 提出 peer 要求的直接消费者 | 用忽略规则隐藏不兼容 |
| lockfile 不一致 | 清单变更与安装结果 | 手改 integrity 或删除锁文件 |
| 本地通过 CI 失败 | pnpm 版本、Node、冻结安装与平台 | 在 CI 中自动升级全部依赖 |

升级应保留能复现的旧输入与失败信息，按受影响的配置包、Vue 工具和原生模块分别回归。通用 lint 通过不能证明二进制依赖、所有版本范围或生产部署已通过。
