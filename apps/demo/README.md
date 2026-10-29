# 消费示例（新手教程）

这是一个**示例项目**，演示如何在自己的项目里同时使用本仓库发布的三个检查配置，并配合 UnoCSS 写样式。读完这篇教程，你可以：

- 知道三个检查工具各管什么、配置文件怎么写；
- 亲手制造几个错误，看工具如何报告并自动修复；
- 看懂一份完整的 UnoCSS 配置，并自己新增图标和主题颜色。

示例是私有项目，不会发布，也不属于公开 API。

## 先弄懂几个词

| 名词 | 通俗解释 |
| --- | --- |
| lint（代码检查） | 让工具读你的文件，按一套规则挑出写法问题，类似“语文老师批改作业” |
| ESLint | 检查 JavaScript、TypeScript 和 Vue 脚本 |
| Stylelint | 检查 CSS、SCSS 和 Vue 里的样式 |
| Markdownlint | 检查 `.md` 文档的写法 |
| 共享配置 | 把规则写成 npm 包，多个项目复用同一套，不必每个项目重抄 |
| UnoCSS | 一个原子化 CSS 引擎：在 HTML 里直接写 `bg-primary` 这样的类名，它按需生成对应的 CSS |

## 开始之前

1. 安装依赖。在**仓库根目录**执行一次即可：

   ```bash
   # 首次准备工作区或依赖清单变化时安装；只改配置包源码无需重复安装。
   pnpm install
   ```

2. 本教程之后的命令都在示例目录里执行，先进入它：

   ```bash
   # 进入 apps/demo 目录后执行后续命令。
   cd apps/demo
   ```

Node.js 和 pnpm 的版本要求写在仓库根目录 `package.json` 的 `engines` 与 `packageManager` 中。

## 第一步：跑一遍检查

```bash
# 运行当前项目已配置的代码、样式和文档检查，不自动修复。
pnpm run lint
```

它会依次运行 ESLint、Stylelint 和 Markdownlint。全部通过时，每一项都不会列出问题，Markdownlint 最后一行是 `Summary: 0 issues in 0 files`。这说明示例本身是“合格”的。

再运行类型检查：

```bash
# 检查当前项目的 TypeScript 类型，不输出编译产物。
pnpm run typecheck
```

只显示命令本身、没有错误信息就表示通过。

## 第二步：亲手制造几个问题

下面的命令用“管道”把一段**有问题的代码**直接交给工具检查，不会修改任何文件，放心试。

### 试试 ESLint

```bash
# 通过标准输入检查一段 TypeScript 示例，不创建源文件。
printf 'const message = "hello";\nconsole.log(message)\n' | pnpm exec eslint --stdin --stdin-filename src/try.ts
```

你会看到类似下面的报告：

```text
  1:17  error  Strings must use singlequote  style/quotes
  1:24  error  Extra semicolon               style/semi
```

意思是：第 1 行第 17 列的字符串应该用单引号，第 24 列的分号是多余的。行尾的 `style/quotes` 是**规则名**，想了解某条规则可以直接搜索它。

### 试试 Stylelint

```bash
# 通过标准输入检查一段 CSS 示例，不创建源文件。
printf '.box {\n  color: #FFFFFF;\n  display: flex;\n}\n' | pnpm exec stylelint --stdin-filename src/try.css --config stylelint.config.js
```

你会看到：

```text
2:10  ✖  Expected "#FFFFFF" to be "#FFF"            color-hex-length
3:3   ✖  Expected "display" to come before "color"  order/properties-order
```

意思是：颜色值能写短就写短，属性要按约定顺序排列（`display` 要放在 `color` 前面）。

### 试试 Markdownlint

先新建一个有问题的临时文件，再检查，最后删掉它：

```bash
# 写入包含重复标题的 Markdown 临时示例。
printf '# 标题\n\n## 说明\n\n文字\n\n## 说明\n\n文字\n' > try-duplicate-heading.md
# 检查指定 Markdown 文件，使用命令中的配置或 CLI2 自动发现配置。
pnpm exec markdownlint-cli2 try-duplicate-heading.md
# 移除本节创建的 Markdown 临时示例文件。
rm try-duplicate-heading.md
```

你会看到 `MD024/no-duplicate-heading`：同一级下出现了两个同名标题“说明”。

### 让工具自动修复

很多问题可以自动修复。在示例里运行：

```bash
# 按当前项目配置自动修复代码、样式与文档，会写回文件。
pnpm run format
```

它的作用和 `lint` 一样，只是多带了 `--fix`，**会直接改文件**。所以日常习惯是：先 `lint` 看问题，再决定要不要 `format`。

## 第三步：认识每个文件

### 工具配置文件

| 文件 | 它做什么 |
| --- | --- |
| `eslint.config.js` | 只有几行：引入 `zzjtnb()`，并把 Markdown 交给 Markdownlint，避免两个工具重复报告 |
| `stylelint.config.js` | 引入 `zzjtnb()` 的默认配置 |
| `.markdownlint-cli2.mjs` | 通过公开 CLI2 入口复用共享规则和扫描排除项 |
| `uno.config.ts` | UnoCSS 的配置，下一节细讲 |
| `tsconfig.json` | TypeScript 的检查范围和严格程度，每个选项都有注释 |
| `tests/uno.test.ts` | 验证 `uno.config.ts` 是否生效，每条测试都说明它在证明什么 |

### 源码文件

| 文件 | 内容 |
| --- | --- |
| `src/greeting.ts`、`src/status.ts` | 普通 TypeScript 模块：`greeting.ts` 提供问候语；`status.ts` 把图标类名写在 TS 里，说明 UnoCSS 不只扫描模板 |
| `src/components/Greeting.vue` | 问候组件：组合工具类、主题颜色、本地图标，并带一段 scoped SCSS |
| `src/components/Badge.vue` | 状态徽标：用 `data-[status=success]:bg-success` 按状态换颜色 |
| `src/styles.scss` | SCSS 写法示例：`@apply`、`theme()`、`@container` |
| `src/styles/theme.css` | 亮色和暗色两套主题变量（颜色、圆角等） |
| `src/styles/base.css` | 全局基础样式 |
| `src/assets/icons/*.svg` | 本地图标，用 `i-svg:文件名` 使用 |

## 第四步：UnoCSS 入门

### 它是怎么工作的

你在模板里写类名，UnoCSS 扫描源码，只为**实际出现过**的类名生成 CSS。例如模板里有 `bg-primary`，就会生成：

```css
.bg-primary { background-color: var(--primary); }
```

`var(--primary)` 的真实颜色在 `src/styles/theme.css` 里。换成 `.dark` 主题时，只是变量值变了，类名和组件都不用动。

### `uno.config.ts` 里各部分的作用

文件很长，但每一段都有中文注释。可以按这个顺序读：

1. **文件开头的函数和常量**：图标目录、圆括号变量简写的映射、`data-[...]` 变体的修正。
2. **`content`**：告诉 UnoCSS 去哪些文件里找类名。
3. **`presets`**：预设就是“一整套现成能力”。
   - `presetWind4`：Tailwind v4 风格的类名、重置样式、主题变量。
   - `presetWebFonts`：通过 Bunny 生成 Nunito Sans 与 Fira Code 的 `@font-face` 和字体 token。
   - `presetIcons`：图标。`i-svg:logo` 来自本地 `src/assets/icons`，`i-lucide-home` 这类来自 Iconify 图标集合。
   - `presetAttributify`：支持把类名写成属性，例如 `<div flex items-center />`。
   - `presetTypography`：文章正文排版。
4. **`transformers`**：让 CSS 文件里能用 `@apply`、`theme()` 等指令。
5. **`variants` 与 `rules`**：项目自己补的两条能力。
   - `data-[spacing=0]:p-0`：把属性值输出成带引号的 `[data-spacing="0"]`，避免数字值变成非法选择器。
   - `w-(--panel-width)`：Tailwind v4 的圆括号变量简写，等价于 `w-[var(--panel-width)]`。
6. **`theme`**：颜色、圆角、字体。颜色只引用 CSS 变量，真实取值在 `theme.css`。
7. **`safelist`**：扫描不到、但必须保留的类名。这里用来保留全部本地图标。

### 关于联网

`presetWebFonts` 的字体来源是 Bunny，图标的 CDN 兜底是 `esm.sh`，二者都属于“生成页面样式时”的网络行为。示例本身没有构建流程；`tests/uno.test.ts` 关闭了 preflights，只检查生成的工具类，不依赖这两项。

## 第五步：动手改一改

### 练习一：新增一个本地图标

1. 在 `src/assets/icons/` 里放一个 `star.svg`。建议只保留 `<svg>` 和 `<path>`，不要写 `fill`，这样图标会自动跟随文字颜色。
2. 在任意组件里用 `<span class="i-svg:star"></span>`。
3. 不需要改 `uno.config.ts`：目录里所有 SVG 都会被自动保留。
4. 运行测试确认配置仍然有效：

   ```bash
   # 返回仓库根目录。
   cd ../..
   # 运行消费示例的单元及契约测试，完成一次后退出。
   pnpm --filter @zzjtnb/lint-demo run test --run
   ```

### 练习二：新增一个主题颜色

以新增 `info`（信息提示色）为例：

1. 在 `src/styles/theme.css` 的 `:root` 和 `.dark` 里各加两个变量：`--info` 与 `--info-foreground`。
2. 在 `uno.config.ts` 的 `theme.colors` 里仿照 `success` 加一组：

   ```ts
   info: {
     DEFAULT: 'var(--info)',
     foreground: 'var(--info-foreground)',
   },
   ```

3. 现在就可以用 `bg-info text-info-foreground` 了。亮色和暗色两套值都要写，否则切换主题时会出现缺色。

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| pnpm 提示依赖不同步 | 在仓库根目录重新执行 `pnpm install` |
| 改了配置包的源码，示例没变化 | 示例读取的是各配置包的 `dist` 构建产物，需要先重新构建对应的包 |
| 想让工具忽略某个文件 | ESLint 在配置里加 `ignores`，Stylelint 加 `ignoreFiles`，Markdownlint 加 `ignores` |
| 想关掉某条规则 | 在对应配置里按规则名设置为 `off`（Stylelint 为 `null`），具体写法见各工具的文档页 |
| ESLint 的 `unocss` 集成 | 它依赖额外的可选包，示例没有启用 |

## 目录速查

```text
apps/demo/
├── eslint.config.js          ESLint 配置
├── stylelint.config.js       Stylelint 配置
├── .markdownlint-cli2.mjs  Markdownlint 配置
├── uno.config.ts             UnoCSS 配置
├── tsconfig.json             TypeScript 配置
├── src/
│   ├── greeting.ts           问候语模块
│   ├── status.ts             状态与图标类名
│   ├── components/           Vue 组件
│   ├── styles.scss           SCSS 示例
│   ├── styles/               主题变量与基础样式
│   └── assets/icons/         本地图标
└── tests/uno.test.ts         验证 UnoCSS 配置
```
