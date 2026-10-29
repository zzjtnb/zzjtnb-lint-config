---
# 所属包、侧栏标题与顺序由导航生成器读取，不改变页面正文。
navigation:
  # 当前页面在该包侧栏中的名称。
  text: 详细配置
  # 三个公开包分别成组，辅助文档不混入包的配置页。
  group: eslint
  # 数值越小越靠前；快速开始固定为该包入口。
  order: 30
---

# ESLint 详细配置

本页按 `zzjtnb(options, ...configs)` 的参数组织：先查看完整配置，再按用途选择选项。最小接入见[快速开始](/eslint)，本包与上游的规则差异见[本项目预设](/eslint/presets)。

## 完整配置示例

在 `package.json` 中声明 `"type": "module"`，创建以下 `eslint.config.js`。示例列出当前本包及 antfu 的正式顶层选项，展示全局选项与文件级片段的放置位置；它不是默认值快照。注释标明默认行为，项目只保留需要调整的字段即可。本包公开类型不包含已弃用的顶层 `overrides`；各语言的规则覆盖放在对应集成对象的 `overrides` 内。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // 项目类型：app（默认）或 lib；lib 会启用上游的库项目约定。
    type: 'app',
    // 额外的组件扩展名，默认空数组；Vue 支持由 vue 单独控制。
    componentExts: [],
    // 默认读取 Git 忽略声明；false 关闭，也可传上游 gitignore 选项对象。
    gitignore: true,
    // 未设置时沿用本包通用排除；数组替换本包追加项，false 接管该阶段的默认列表。
    defaultIgnores: undefined,
    // 追加项目独有路径；也可传函数接收并修改已有忽略列表。
    ignores: ['**/generated/**'],
    // 上游较少主观规则的开关，默认 false；不代替按规则名覆盖。
    lessOpinionated: false,
    // 留空时自动识别编辑器环境，影响部分自动修复行为；CI 可显式设为 false。
    isInEditor: undefined,
    // 默认统一使用 ts/*、style/* 等前缀；false 保留插件原名。
    autoRenamePlugins: true,

    // JavaScript 核心集成不能关闭；对象内 overrides 调整该语言的规则。
    javascript: { overrides: {} },
    // 本包默认开启 TypeScript；false 关闭，更多对象选项见下文。
    typescript: true,
    // Node.js 与 JSDoc 默认开启。
    node: true,
    jsdoc: true,
    // JSX 默认开启；其 a11y 扩展是另一项集成，不随此布尔值开启。
    jsx: true,
    // 现代化、性能建议默认开启；可传 e18e 对象选择具体能力。
    e18e: true,
    // 以下上游规则集默认开启；支持布尔值或各自的 overrides 对象。
    unicorn: true,
    perfectionist: true,
    imports: true,
    test: true,
    // Vue 与 a11y 默认开启；vue: false 关闭整个集成，a11y: false 只关闭无障碍。
    vue: {
      // Vue 版本默认 3，按实际项目选择。
      vueVersion: 3,
      // Vue 模板无障碍检查，不负责验证真实页面的视觉或交互效果。
      a11y: true,
      // 默认处理 Vue SFC 中可检查的代码块。
      sfcBlocks: true,
      // Vue 规则覆盖只作用于该集成；空对象表示不追加覆盖。
      overrides: {},
    },
    // 数据与工程文件的集成默认开启，false 分别关闭。
    jsonc: true,
    yaml: true,
    toml: true,
    // 默认 true；此例将 Markdown 交给 Markdownlint，因此显式关闭。
    markdown: false,
    // stylistic 默认开启；对象仅调整所列风格，false 关闭这组规则。
    stylistic: {
      // 默认两空格缩进、单引号、无分号、stroustrup 大括号风格。
      indent: 2,
      quotes: 'single',
      semi: false,
      braceStyle: 'stroustrup',
    },
    // 正则检查默认开启，可用 level 调整级别，或通过 overrides 覆盖规则。
    regexp: { level: 'error' },
    // 默认根据当前目录或上级的 pnpm-workspace.yaml 自动开启；此例显式开启。
    pnpm: true,

    // UnoCSS 默认关闭；依赖已提供，此例显式启用。
    unocss: {
      // 开启后默认检查 attributify 属性模式。
      attributify: true,
      // 默认不对 blocklist 产生 error；true 开启严格模式。
      strict: false,
    },
    // 外部 formatter 默认关闭；此例只负责 HTML，避免与其他两个工具重复写回。
    formatters: {
      // HTML 使用插件提供的 Prettier 格式化。
      html: true,
      // CSS、SCSS 与 Markdown 留给 Stylelint、Markdownlint。
      css: false,
      markdown: false,
      // 以下格式在本例中不启用；XML、SVG、Astro、Slidev 还可能需要额外的上游插件。
      graphql: false,
      xml: false,
      svg: false,
      astro: false,
      slidev: false,
    },
    // antislop 默认开启；此例展示上游维护的规则子集选项。
    antislop: {
      // 开启 antislop 后这两个子集默认均开启，也可分别关闭。
      slop: true,
      sonarjs: true,
      // 默认认知复杂度上限 15；false 单独关闭这条复杂度规则。
      cognitiveComplexity: 15,
    },
    // 其他框架默认关闭，依赖未由本包提供；仅在实际项目安装所需插件后开启。
    angular: false,
    astro: false,
    react: false,
    nextjs: false,
    solid: false,
    svelte: false,

    // ESLint 报告选项，不包含 --fix、缓存或命令行退出策略。
    linterOptions: {
      // 默认允许行内配置注释；true 禁止其改变规则配置。
      noInlineConfig: false,
      // 未使用的禁用注释沿用上游 warn。
      reportUnusedDisableDirectives: 'warn',
      // 本包默认对未使用的行内配置报告 warn。
      reportUnusedInlineConfigs: 'warn',
    },
    // 首参 rules 覆盖全部共享规则；下方文件级片段仍有更高优先级。
    rules: {
      // 本包默认为 warn；消费方仍可调整级别，退出策略由 CLI 决定。
      'no-console': 'warn',
    },
  },
  {
    // 第二个及后续参数是原生 Flat Config 片段；name 便于 Inspector 定位。
    name: 'project/scripts',
    // files 只能放在后续片段，限定这次覆盖的作用范围。
    files: ['scripts/**/*.ts'],
    // 当前片段内的排除只限制此片段，并非全局忽略列表。
    ignores: ['scripts/generated/**'],
    // 此例只允许 scripts 目录使用 console。
    rules: { 'no-console': 'off' },
  },
)
```

## 参数与优先级 {#工厂签名}

```ts
async function zzjtnb(
  options?: ESLintConfigOptions,
  ...configs: ESLintUserConfig[]
): Promise<Linter.Config[]>
```

第一个参数负责集成、全局忽略与规则覆盖；后续参数接收 Flat Config 对象、数组、异步结果及上游 composer。原生 `files` 只能用于后续片段。可配置的规则没有固定数量，`rules` 按当前插件的正式规则名和参数填写，具体默认差异见[规则示例](/eslint/presets#本包的规则覆盖)。

生成顺序为：上游规则与本包差异 → 各集成的规则覆盖 → 首参 `rules` → 后续片段。同一个实际匹配文件采用最后生效的同名规则；未匹配的片段不参与。`shadcn` 默认注册，但不自动开启全部规则，也不自动忽略生成代码。

## 项目与忽略项

| 字段 | 取值与默认行为 | 生效范围 |
| --- | --- | --- |
| `type` | `app`（默认）或 `lib` | 上游的应用、库项目约定 |
| `componentExts` | 扩展名数组，默认 `[]` | 额外组件文件的集成范围 |
| `gitignore` | 默认 `true`；支持布尔值或上游对象选项 | Git 忽略声明 |
| `defaultIgnores` | 留空沿用本包列表；数组替换本包追加项；`false` 接管当前忽略入口 | 本包追加的通用排除 |
| `ignores` | 数组追加；函数接收既有列表 | 全局忽略，详细合并语义见[忽略行为](/eslint/presets#忽略行为) |
| `isInEditor` | 默认根据环境识别；布尔值可覆盖 | 部分规则的自动修复行为 |
| `autoRenamePlugins` | 默认 `true` | 插件与规则前缀，如 `ts/*`、`style/*` |
| `lessOpinionated` | 默认 `false` | antfu 的主观规则选集，不撤销消费方显式覆盖 |

## 语言与规则集

`node`、`jsdoc`、`jsx`、`e18e`、`unicorn`、`perfectionist`、`imports`、`test`、`jsonc`、`yaml`、`toml`、`markdown`、`stylistic`、`regexp` 默认由上游开启。JavaScript 核心不能关闭；本包另外默认开启 TypeScript 和 Vue。对象选项与规则子集仍由上游维护，不复制为本包的另一套类型。

### TypeScript

`typescript` 支持布尔值或对象：

| 对象字段 | 用途、默认与条件 |
| --- | --- |
| `parserOptions` | 直接传给上游解析器；本包不默认开启装饰器或元数据选项 |
| `tsconfigPath` | 提供实际 tsconfig 路径后启用类型感知规则；未设置时不启用这条路径 |
| `filesTypeAware` | 覆盖类型感知文件范围；需要与实际启用的类型感知检查配套 |
| `ignoresTypeAware` | 排除类型感知文件；普通语言规则不因此全部关闭 |
| `overrides` | 覆盖普通 TypeScript 规则 |
| `overridesTypeAware` | 覆盖类型感知规则，配合 `tsconfigPath` 使用 |
| `erasableOnly` | 默认 `false`；开启前需另行安装上游要求的 `eslint-plugin-erasable-syntax-only` |

例如项目确实提供 `tsconfig.json` 时：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  typescript: {
    // 相对消费项目的实际配置文件；启用需要类型信息的规则。
    tsconfigPath: 'tsconfig.json',
    // Vue 不默认进入类型感知范围；需要时显式包含，并评估检查成本。
    filesTypeAware: ['**/*.?([cm])ts', '**/*.?([cm])tsx', '**/*.vue'],
    // 只改变该集成的规则，不影响其他语言。
    overrides: { 'ts/consistent-type-definitions': ['error', 'interface'] },
  },
})
```

本包依赖 TS6 的经典 API 是因为当前 typescript-eslint 的要求，不是用来加载 JS 配置。消费项目可维护自己的编译器版本；TS7 场景仍受上游 peer 和语法支持范围约束，见[编译器边界](https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/packages/eslint/README.zh-CN.md#typescript-与-nestjs)。

### NestJS 装饰器与依赖注入

使用旧式装饰器元数据的 NestJS 项目，需要保留构造函数注入所依赖的运行时值导入。本包不在全局开启 NestJS 选项；消费方已有 TypeScript 项目且需要类型感知检查时，使用公开的 TypeScript 集成入口：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  typescript: {
    // 从工程根目录运行 ESLint，使用网关实际的 TypeScript 配置。
    tsconfigPath: './apps/gateway/tsconfig.json',
    // 仅对网关启用类型感知规则，不将前端和创建器模板纳入该项目。
    filesTypeAware: ['apps/gateway/**/*.ts'],
  },
})
```

此入口启用类型感知规则，并通过上游 Project Service 为文件选择所属 TypeScript 项目。解析器从实际关联的 TypeScript Program 读取装饰器选项，因而无需再在 ESLint 中重复声明 `experimentalDecorators`、`emitDecoratorMetadata`。`tsconfigPath` 不是把所有匹配文件强制归入一个配置；匹配文件仍须属于其实际项目，检查配置和测试文件时也要核对项目包含范围。独立 NestJS 工程可使用 `./tsconfig.json` 与 `src/**/*.ts`。

类型感知规则同时检查 Promise、类型安全等问题，会增加检查开销；并非仅用于装饰器，也不能代替 `tsc` 类型检查。没有所属 TypeScript 项目的创建器源码模板不应加入 `filesTypeAware`；模板若包含旧式装饰器，可单独使用下方非类型感知配置。

未启用类型感知检查时，仍可按实际 NestJS 文件范围显式配置解析器：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {},
  {
    // Monorepo 中仅作用于 NestJS 网关；独立项目可改为 src/**/*.ts。
    files: ['apps/gateway/**/*.ts'],
    languageOptions: {
      parserOptions: {
        // 让解析器识别旧式装饰器的运行时引用。
        experimentalDecorators: true,
        // 保留装饰器元数据需要的值导入，避免修复为 import type。
        emitDecoratorMetadata: true,
      },
    },
  },
)
```

这两项只影响 ESLint，不会修改 TypeScript 编译行为。NestJS 应用的编译配置还需要启用对应选项：

```jsonc [tsconfig.json]
{
  "compilerOptions": {
    // 启用 NestJS 使用的旧式装饰器。
    "experimentalDecorators": true,
    // 编译时生成依赖注入需要的运行时类型元数据。
    "emitDecoratorMetadata": true,
  },
}
```

这份编译配置是应用生成元数据的依据。类型感知方案读取它；非类型感知方案需要在 ESLint 中另行声明相同选项。不要通过全局关闭 `ts/consistent-type-imports` 代替正确的项目配置。

### Vue

`vue` 支持 `false` 或对象。`vueVersion` 默认 `3`；`a11y` 在 Vue 集成启用时默认 `true`，对应插件已由本包提供；`sfcBlocks` 默认 `true`，也可传上游 processor 的细分选项；`overrides` 用于 Vue 规则覆盖。可访问性规则只能检查静态模板，不能替代真实页面的键盘、焦点和对比度验收。

### pnpm

`pnpm` 整体默认按当前目录或上级是否存在 `pnpm-workspace.yaml` 判断。`false` 关闭；对象用于细分：

| 对象字段 | 默认行为与用途 |
| --- | --- |
| `json` | 默认 `true`，检查 package.json |
| `yaml` | 默认 `true`，检查 workspace YAML |
| `sort` | 当前上游运行时默认 `true`；`false` 关闭 pnpm 专属 YAML 条目排序 |
| `catalogs` | 按工作区是否使用 catalogs 自动判断，也可显式覆盖 |
| `stylistic` | 可覆盖该集成的格式相关行为 |
| `isInEditor` | 可覆盖该集成的编辑器识别 |

本包只停止强制 trustPolicy，其他 pnpm 设置和 YAML 排序、格式化仍沿用上游。`pnpm: { yaml: false }` 关闭 pnpm YAML 集成，不等于全局忽略该文件；需完全排除时使用 `ignores`。

### 覆盖本包的 pnpm 默认差异

本包只从上游已生成的 pnpm YAML 配置中移除 trustPolicy 强制值，并将 catalog 重复判断设为 exact-version。它不自行启用 pnpm、不改变 parser 或匹配范围，也不修改其他 pnpm 设置。首参 rules 和后续文件片段仍有最终覆盖权：

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  // 消费方选择需要的规则参数，不受本包默认差异锁定。
  rules: {
    // 此例要求 trustPolicy；settings 是本项目明确选择的完整强制字段对象。
    'pnpm/yaml-enforce-settings': [
      'error',
      {
        settings: { trustPolicy: 'no-downgrade' },
      },
    ],
    // 此例改为同名即重复；即使版本声明不同，也报告重复。
    'pnpm/yaml-no-duplicate-catalog-item': [
      'error',
      {
        checkDuplicates: 'name-only',
      },
    ],
  },
})
```

只对某个 workspace 文件生效时，将同样的 rules 放进后续带 `files: ['pnpm-workspace.yaml']` 的片段。也可按 ESLint 原生语义将规则设为 off；pnpm 集成未启用时，不要单独开启其插件规则。

## 按需扩展与格式化 {#格式化职责}

完整示例中的 UnoCSS、Vue 无障碍、formatter、antislop 依赖均已由本包提供。Vue 无障碍和 antislop 默认开启；UnoCSS、formatter 需要显式开启。对应依赖、默认状态见[按需扩展](/eslint/presets#按需扩展)。

- `unocss.attributify` 在集成开启后默认为 `true`；`unocss.strict` 默认为 `false`。
- `antislop.slop`、`antislop.sonarjs` 在集成开启后默认为 `true`；`cognitiveComplexity` 默认 `15`，`false` 关闭复杂度规则。`slop` 还可传对象控制 `cwd` 和 `inspection`，由插件管理扫描范围。
- `formatters` 可逐项配置 `css`、`html`、`markdown`、`graphql`、`xml`、`svg`、`astro`、`slidev`；`prettierOptions`、`dprintOptions` 用于调整上游格式化器。XML/SVG 需 `@prettier/plugin-xml`，Astro 需 `prettier-plugin-astro`，Slidev 需 `prettier-plugin-slidev`，这些专用依赖不在本包中。
- `formatters: true` 会启用上游的一组格式，不等于只启用 HTML；已使用 Stylelint、Markdownlint 时按完整示例逐项选择。`stylistic: false` 仅关闭风格规则，不关闭排序等独立规则的修复。

Angular、React、Next.js、Solid、Svelte、Astro 是转交给 antfu 的其他选项，本包没有提供其插件。实际使用时按[antfu 官方说明](https://github.com/antfu/eslint-config#optional-configs)安装对应框架依赖后开启；不要把它们与已经内置的四组扩展混为一谈。

## 全局规则与文件级覆盖

`javascript`、`typescript`、`vue` 等对象中的 `overrides` 调整各自集成；首参 `rules` 覆盖全局共享值；后续带 `files` 的片段只覆盖匹配目录或文件。通常在这一层声明项目差异，不复制上游整套规则表。

后续 Flat Config 片段还可使用 ESLint 正式的 `languageOptions`、`settings`、`plugins`、`processor` 和 `extends`；它们是原生配置契约，不是新的 `zzjtnb` 私有字段。插件导入和值应使用该插件的正式导出，不能仅凭字符串名字注册。

## 公共类型和导出

```ts
import { zzjtnb } from '@zzjtnb/eslint-config'
import type {
  ESLintConfigOptions,
  ESLintPnpmOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from '@zzjtnb/eslint-config'
```

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `zzjtnb` | runtime function | 创建异步 Flat Config |
| `ESLintConfigOptions` | type | 第一个参数的类型 |
| `ESLintUserConfig` | type | 后续 Flat Config 片段类型 |
| `ESLintPnpmOptions` | type | antfu `pnpm` 对象选项类型 |
| `ESLintStylisticOptions` | type | antfu `stylistic` 对象选项类型 |

本包没有 default runtime export。不要使用：

```ts
import config from '@zzjtnb/eslint-config'
```

## Config Inspector

在包含 `eslint.config.js` 的消费项目根目录运行：

```bash
# 临时下载并启动 ESLint 官方配置检查器，读取当前目录的配置。
pnpm dlx @eslint/config-inspector
```

按终端显示的地址打开检查器，然后：

1. 在文件匹配输入框选择或输入项目文件路径，例如 `src/App.vue`，查看实际匹配的配置项。
2. 在配置列表查看各项的名称、文件范围和规则；同名规则以最后匹配的配置为准。
3. 在规则页搜索规则名，例如 `vue/require-default-prop`，查看启用状态、选项和配置来源。
4. 在项目配置中调整 `rules` 或追加带 `files` 的配置片段，保存后复查检查器显示的最终值。

检查器用于解释配置，不执行代码检查。确认覆盖结果后，对同一文件运行：

```bash
# 输出目标文件最终生效的配置，不执行 lint。
pnpm exec eslint --print-config src/App.vue
# 实际检查目标文件，确认诊断与配置预期一致，不写回文件。
pnpm exec eslint src/App.vue
```

文件被忽略时先核对 `ignores` 和 Git 忽略规则；未匹配到规则时核对文件扩展名、`files` 和对应语言集成。在线 Playground 可体验共享预设与覆盖效果，消费项目的实际结果以本地配置为准。

检查器的完整选项见 [ESLint Config Inspector 官方文档](https://github.com/eslint/config-inspector)。

## VS Code

同时使用 ESLint、Stylelint 和 Markdownlint 时，保存修复与语言分工统一见[三工具编辑器设置](/quick-start#编辑器配置)。关闭重复的保存格式化，三个工具均使用 explicit 修复动作。

## 常见问题

### 配置包无法解析

确认：

- 项目使用 ESM 配置文件；
- `eslint` 已由消费项目直接安装；
- 配置文件位于项目根目录或通过 `--config` 明确指定；
- 包管理器安装的是当前版本，而不是旧的本地 link。

### 为什么规则没有作用于文件

Flat Config 按配置片段的 `files`、`ignores` 和顺序决定作用范围。追加片段时，检查它的 glob 是否匹配目标文件，并确认没有被前面的全局忽略项排除。

### 为什么 formatter 和 ESLint 互相修改

同一文件由多个格式化器同时负责会产生反复改写。选择一个格式化所有者；如果是 Oxfmt 或 Prettier，通常在共享配置边界设置 `stylistic: false`，并关闭 VS Code 的重复保存格式化。

### 为什么 pnpm workspace 被自动改写

本包不强制写入 trustPolicy；minimumReleaseAgeExcludePrune、shellEmulator 等其他上游设置仍可检查和修复，排序和格式化也不受影响。需要恢复 trustPolicy 强制值时，通过消费方 rules 显式配置该规则的 settings。需要完全排除文件时使用项目的 `ignores`。

## 按真实文件检查最终配置

配置对象能加载，不等于目标文件命中了正确规则。针对实际路径查看合并结果：

```bash
# 输出指定文件实际合并后的 ESLint 配置，用于核对匹配结果。
pnpm exec eslint --print-config src/App.vue
# 检查指定 JavaScript、TypeScript 或 Vue 文件。
pnpm exec eslint src/App.vue --config eslint.config.js
```

`--print-config` 用于解释文件最终使用的 parser、插件和规则，不执行该文件的 lint。再运行第二条命令，才能观察真实诊断。换成 `.ts`、`.json`、`.yaml` 时应分别核对，不以 Vue 的配置结果代替其他文件。

### 全局规则与文件级例外如何选

- 整个项目都应改变的行为放首参 `rules`。
- 仅调整 Vue、JavaScript 等语言默认值时，使用对应集成的覆盖入口。
- 只对某个目录或文件类型改变时，放后续带 `files` 的 Flat Config 片段。
- 禁止把 `files` 塞进首个全局选项对象；该位置不是文件级片段。

```js [eslint.config.js]
import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb(
  {
    // 配置 Markdown 集成；false 关闭，true 或选项对象显式启用或调整该组能力。
    markdown: false,
  },
  {
    // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
    files: ['scripts/**/*.ts'],
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 覆盖 console 使用限制，实际诊断级别由当前规则值决定。
      'no-console': 'off',
    },
  },
  {
    // 只将当前配置块应用到匹配路径；未声明时遵循所属工具的全局适用范围。
    files: ['src/**/*.vue'],
    // 仅覆盖列出的规则；未列出的规则继续使用共享配置或继承配置的值。
    rules: {
      // 控制 Vue prop 是否必须声明默认值，按当前示例级别覆盖共享值。
      'vue/require-default-prop': 'error',
    },
  },
)
```

该示例不会给业务目录关闭 `no-console`，也不会把 Vue 专属规则应用到所有文件。规则范围应跟实际职责一致，不靠全局关闭来掩盖局部问题。

## TypeScript 规则不是完整类型检查

共享工厂启用 TypeScript 语法支持，不代表所有规则都启用了类型信息，也不代表检查器执行了项目编译。需要类型感知规则时，按当前 antfu 的正式 TypeScript 选项配置，并核对文件是否属于对应 TypeScript 项目；不要为每个普通配置文件强行启用项目级类型分析。

Vue 项目仍运行自己的 `vue-tsc`；非 Vue 的 TypeScript 项目运行自己的编译检查。ESLint 不会证明跨文件调用、泛型推断或 Vue 模板类型全部正确。

## Monorepo 中的调用位置

从根运行与从子包运行可能影响 workspace 发现、相对 glob 和配置加载。先选定一套执行边界，再为该边界维护配置，不依赖恰好能向上找到另一应用的依赖。

```bash
# 检查指定 JavaScript、TypeScript 或 Vue 文件。
pnpm --filter @example/web exec eslint . --config eslint.config.js
```

上述命令要求 `@example/web` 自己拥有配置和直接依赖；包名只是消费项目示例。若项目集中在根配置，则使用根目录的正式检查入口，不给每个应用再造一份同义配置。

## 警告、错误与修复成功不是一回事

`reportUnusedDisableDirectives` 默认报告 warning，不会单独导致默认检查命令失败。严格退出策略见 [CLI 检查与修复](#cli-检查与修复)。`--fix` 只修复规则声明可自动修复的部分；剩余错误需要调整源码或有依据的局部配置。

按文件匹配、最终配置、规则含义和修复差异的顺序排查。

## 相关文档

- [快速开始](/quick-start)
- [Stylelint 配置](/stylelint)
- [Markdownlint 配置](/markdownlint)

## CLI 检查与修复

ESLint 默认存在 error 时退出码为 1，只有 warn 时仍可成功退出。不需要也不存在 `--max-errors 0` 参数。

`--max-warnings <数量>` 设置允许的警告上限：默认 -1 表示不限制，0 表示零警告，超过上限时检查失败。它只改变退出策略，不改变规则级别，也不影响自动修复能力。项目默认脚本不设置此参数。

```sh
# 默认策略：error 导致失败，warn 允许通过。
pnpm exec eslint .

# 可选严格策略：有任何警告也导致失败。
pnpm exec eslint . --max-warnings 0

# 可选警告预算：超过 5 条警告时失败。
pnpm exec eslint . --max-warnings 5

# 修复已启用规则提供的可修复问题，剩余 error 仍导致失败。
pnpm exec eslint . --fix
```

### quiet 与自动修复

`--quiet` 只保留 error 报告，但在当前 ESLint 中也会跳过 warn 规则及其自动修复。因此 `eslint . --fix --quiet` 表示仅修复 error 级规则提供的问题，不适用于“修复所有级别，只隐藏警告”的需求。项目默认 format 保留 warn 的检查与修复能力，不自动追加 quiet。

### JSONC 排序首次修复后仍有错误

ESLint 10.13.0 的一次 `--fix` 最多执行 10 轮自动修复。`jsonc/sort-keys` 移动多个属性时，部分修复范围可能重叠，因而需要分轮应用；原始配置与目标顺序差异较大时，一次命令可能达到轮数上限，留下仍可自动修复的排序错误。这不等于存在两套排序规则冲突，也不代表第一次命令成功。

先检查退出状态和剩余规则，再对照修复前后的属性、值及注释，确认仅调整顺序且持续收敛。已有文件可以再次执行同一修复命令；若出现 `ESLintCircularFixesWarning`、来回改动或多次仍不收敛，应检查冲突配置，不持续重试。

对于自行维护的创建器，优先让新增选项与相关原有选项集中生成。例如 gateway 的 `incremental` 与 `tsBuildInfoFile` 放在一起，可减少从官方初始顺序到最终顺序的移动；仍由既有规则决定最终格式，不能为此更改配置值、删除官方注释或关闭排序规则。创建器应使用全新生成文件验证首次修复的退出状态，而不是只检查已经格式化的工作区。

本包不增加“失败后自动重跑”的包装命令，也不把某个应用的属性顺序变为全局特例。轮数限制以安装版本的 ESLint 实现为准，排序能力以安装版本的 JSONC 插件为准：

- [ESLint 自动修复实现](https://github.com/eslint/eslint/blob/v10.13.0/lib/linter/linter.js)
- [jsonc/sort-keys 规则](https://ota-meshi.github.io/eslint-plugin-jsonc/rules/sort-keys.html)

## 模块导入与源码扩展名

当前工具链支持时省略扩展名；必须显式指定时，使用实际引用文件的后缀。真实文件是 `module.ts` 就写 `./module.ts`，是 `module.mjs` 就写 `./module.mjs`，不使用不存在的 `module.js` 代指 TS 源码。

本包默认开启 `zzjtnb/import-extensions: error`：对照磁盘文件检查相对 import、转导出、动态 import 和 require 中的显式后缀。真实 JS 文件不会因同目录有 TS 文件而被禁止；无后缀路径、包名、虚拟模块保持各自工具链的解析方式。声明文件描述运行时契约，不按实现源码重写。

此规则只报告实际文件后缀不一致，不负责禁止所有 .js、验证完整的包解析或替你选择编译模式。它不自动修复，因为改为 .ts 后可能还需要同步编译器设置。省略后缀是否可用，以当前模块解析和构建后运行结果为准。

### Vite、tsdown 等打包链路

工具支持时省略 TS、JS 模块后缀；Vue、JSON 和其他资源导入仍按对应插件要求保留必要后缀：

```ts [main.ts（打包器解析）]
// 实际引用 app.module.ts；打包器处理模块解析。
import { AppModule } from './app.module'
```

### NodeNext ESM 编译后运行

Node ESM 的相对文件导入需要显式后缀。源码使用真实 .ts 后缀，并由 TypeScript 5.7 及以上版本在编译时重写为 .js；无需把源码路径写成尚不存在的编译产物。

::: code-group

```ts [main.ts（源码）]
import { AppModule } from './app.module.ts'
```

```jsonc [tsconfig.json（编译选项片段）]
{
  "compilerOptions": {
    // 使用 Node 原生 ESM / CommonJS 模块语义。
    "module": "NodeNext",
    // 按 Node 的模块与 package.json exports 规则解析导入。
    "moduleResolution": "NodeNext",
    // 将相对导入中的 .ts、.tsx、.mts、.cts 后缀重写为对应输出后缀。
    "rewriteRelativeImportExtensions": true
  }
}
```

```js [main.js（构建产物）]
import { AppModule } from './app.module.js'
```

:::

该编译选项处理相对源码路径，不会把路径别名、包名或任意运行时计算的路径转换为可执行导入。修改后运行类型检查、构建和实际入口验证；仅 ESLint 通过不能证明 Node 能加载产物。直接由 Node 执行 TS 源码时，也应保留运行时所要求的真实后缀。

消费方通过正式规则入口覆盖本包默认值；历史编译契约确需保留时，可将 `rules['zzjtnb/import-extensions']` 设为 `off`，由项目自身的编译与运行验证负责。
