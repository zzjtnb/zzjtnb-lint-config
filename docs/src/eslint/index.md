---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 快速开始
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: eslint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 0
---

# ESLint 快速开始

ESLint 检查 JavaScript、TypeScript、Vue 等代码中的规则问题，并修复规则支持自动修改的部分。开始配置前，可先通过以下入口了解工具与规则：

- [ESLint 官方文档](https://eslint.org/docs/latest/)：了解安装、配置、命令行和编辑器集成。
- [ESLint Playground](https://eslint.org/play/)：在线尝试代码和规则，观察诊断与修复结果。
- [antfu 配置说明](https://github.com/antfu/eslint-config)：查询本包所基于的语言集成与配置选项。

在线 Playground 使用自身提供的引擎与插件，不会自动加载本包或本地项目配置；项目实际结果应以本地检查为准。插件规则的选项应查对应插件文档，不能只查 ESLint 核心规则。

`@zzjtnb/eslint-config` 在 antfu 的 Flat Config 上只增加本项目需要的差异。最终优先级是 **上游 → 本项目预设 → 消费项目配置**；消费项目不需要复制整套规则。

## 安装

运行环境与兼容的 ESLint 版本见[包的消费要求](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/README.zh-CN.md#环境要求与安装)。

```bash
# 安装检查引擎及共享配置。
pnpm add -D eslint @zzjtnb/eslint-config
```

## 使用默认预设

在项目根目录创建 `eslint.config.js`，并在 `package.json` 中声明 `"type": "module"`。直接使用 ESM 配置，不需要 TypeScript 配置加载器或额外运行 flag。未声明 ESM 的项目可使用 `.mjs`，不要同时保留多份配置。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

// 工厂结果包含上游配置和本项目差异，可直接作为默认导出。
export default zzjtnb()
```

## 检查与修复

```bash
# 发现并检查当前项目中配置适用的文件，不写回修改。
pnpm exec eslint .
# 对同一范围应用规则实际提供的自动修复；剩余问题仍会报告。
pnpm exec eslint . --fix
```

## 覆盖本项目规则

本包对 console.log 等调用报告 warn，保留上游允许的 console.warn、console.error。消费方可将级别提高为 error，让未被允许的调用阻断检查：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 消费方规则优先于本项目默认值；未写出的规则继续继承。
  rules: {
    // 将已有 console 检查从 warn 提高到 error，保留继承的 allow 参数。
    'no-console': 'error',
  },
})
```

需要按文件覆盖或继续追加配置时，使用[正式工厂参数](/eslint/configuration#工厂签名)。
