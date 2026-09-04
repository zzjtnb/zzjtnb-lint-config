import type { Variant } from 'unocss'
/**
 * UnoCSS 配置
 * - 本文件是消费示例项目的 UnoCSS 配置，同时作为可直接参考的完整写法。
 * - 本文件是项目原子化 CSS 的唯一入口，不绑定某一个组件库。
 * - presetWind4 提供 Tailwind v4 兼容语法、reset、theme 变量和常用工具类。
 * - 项目侧只补当前 Wind4 对现有源码不匹配或输出不合法的 Tailwind v4 语法。
 * - 主题 token 统一映射到 CSS 变量；变量值、暗色主题和业务语义色在样式文件中维护。
 *
 * UnoCSS 官方文档：https://unocss.dev/
 * UnoCSS 官方教程：https://tutorial.unocss.dev/
 * UnoCSS 官方 Playground：https://unocss.dev/playground
 * Iconify 图标集合预览：https://icones.js.org
 * Iconify 图标搜索：https://icon-sets.iconify.design/
 *
 * 新手阅读顺序：
 * 1. 先看 `export default defineConfig({...})` 里每一项的注释，了解各部分的职责。
 * 2. 文件开头的函数和常量（图标目录、圆括号变量、data 变体）是 `rules`、`variants`、`safelist` 的实现细节，需要时再回头看。
 * 3. 改动后用 `pnpm exec vitest run apps/demo/tests --project unit`（仓库根目录）验证配置仍然有效。
 */
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'
import { createRemToPxProcessor } from '@unocss/preset-wind4/utils'
import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  presetWind4,
  transformerDirectives,
} from 'unocss'

// 本地 SVG 图标目录；目录名同时决定 `i-svg:*` 本地图标集合的来源。
// 按配置文件所在位置定位，不依赖启动进程的工作目录。
const iconsDir = fileURLToPath(new URL('./src/assets/icons', import.meta.url))

// 本地图标类名可能由配置或运行时代码间接引用，不能完全依赖内容扫描。
// safelist 明确保留 `i-svg:文件名`，避免生产构建时未出现的本地图标被 tree-shake 掉。
function generateSafeList() {
  if (!existsSync(iconsDir)) {
    return []
  }

  try {
    return readdirSync(iconsDir)
      .filter(file => file.endsWith('.svg'))
      .map(file => `i-svg:${file.replace('.svg', '')}`)
  }
  catch (error) {
    console.error('无法读取图标目录:', error)
    return []
  }
}

// Tailwind v4 支持 `w-(--sidebar-width)`，等价于 `w-[var(--sidebar-width)]`。
// 项目源码和组件依赖中都可能使用这类圆括号变量简写；当前 Wind4 尚未覆盖这些匹配。
// 这里集中补齐实际用到的工具前缀，避免在业务组件或第三方组件里改写为冗长的 `w-[var(...)]`。
const cssVariableUtilityProperties = {
  'bg': 'background-color',
  'border': 'border-color',
  'max-h': 'max-height',
  'max-w': 'max-width',
  'origin': 'transform-origin',
  'w': 'width',
} as const

// 从映射表生成匹配规则，避免新增工具前缀时出现“映射已补、正则漏改”的漂移。
const cssVariableUtilityRE = new RegExp(
  `^(${Object.keys(cssVariableUtilityProperties).sort((a, b) => b.length - a.length).join('|')})-\\((--[\\w-]+)\\)$`,
)

// 规则回调拿到的是 string；收窄后才能安全索引 cssVariableUtilityProperties。
type CssVariableUtility = keyof typeof cssVariableUtilityProperties

// base.css 直接消费 `var(--font-serif)`，这类 CSS 变量需要通过 safelist 触发 Wind4 theme preflight 生成。
// 字体变量的唯一配置源是 theme.font；不要再在 variables.css 里手写同名 --font-* 变量。
const themeUtilitySafelist = [
  'font-serif',
]

// arbitrary data attribute 的值最终会进入 CSS 选择器，必须做字符串转义而不是直接拼接。
function quoteAttributeValue(value: string): string {
  const normalized = value.trim().replace(/^(['"])(.*)\1$/, '$2')

  return `"${normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// Tailwind 的 `data-[size=large]` 语义是 `&[data-size="large"]`。
// 当前 Wind4 会输出未加引号的属性值；字符串值通常还能被浏览器接受，但数字值如 `[data-spacing=0]`
// 会被 Lightning CSS 严格解析为非法选择器。这里统一把 arbitrary data 属性值序列化为合法 CSS 字符串。
// order: -1 用于早于内置 data variant 执行；multiPass 保证 `data-[a=b]:data-[c=d]:...` 这类链式变体都能被处理。
const dataAttributeVariant: Variant = {
  // 固定名称方便从生成结果或调试日志中识别这条项目级变体。
  name: 'quoted-data-attribute',
  // 必须早于 Wind4 内置 data variant，否则内置规则会先生成未加引号的选择器。
  order: -1,
  // 只接管 `data-[name=value]:utility`，不影响 `data-active:*` 等其它 data 语法。
  match(matcher) {
    const match = matcher.match(/^data-\[([\w-]+)=([^\]]+)\]:(.+)$/)

    if (!match) {
      return
    }

    const [, name, value, rest] = match

    return {
      matcher: rest,
      selector: selector => `${selector}[data-${name}=${quoteAttributeValue(value)}]`,
    }
  },
  // 允许同一个类名连续处理多个 data variant，例如 `data-[a=b]:data-[c=d]:border`。
  multiPass: true,
}

export default defineConfig({
  // 内容扫描范围决定哪些原子类会进入最终 CSS。
  // UnoCSS Vite pipeline 默认会扫描 Vue/HTML/Markdown 等模板类文件，但不会默认扫描普通 TS/JS 文件。
  // 本项目的路由 meta、菜单图标、状态配置、cva/class-variance-authority 字符串都在 src 下的 TS/JS/Vue 中声明，因此显式扫描这些运行时源码。
  // 示例中对应 src/status.ts：状态与图标类名写在 TS 文件里，同样会被扫描。
  // src 下的 Markdown 当前是设计说明和 README，不参与运行时界面；不纳入 include 可以避免文档示例产生误提取。
  // 样式缓存异常时可清理：rm -rf node_modules/.cache/unocss node_modules/.vite
  content: {
    // pipeline 是 UnoCSS 的内容提取管线；这里使用运行时源码白名单，避免扫描 src-tauri、dist、backup、docs 和构建产物。
    // 示例项目中没有 src-tauri、backup、docs 目录，白名单同样会排除 tests 和 dist。
    pipeline: {
      // include 只列会产生运行时界面类名的入口；新增运行时源码目录或运行时 Markdown/MDX 页面时应同步扩展这里。
      include: [
        // Vite HTML 入口中可能声明全局挂载类名。
        /index\.html$/,
        // Vue SFC、TS/JS 配置对象、TSX/JSX 组件都参与类名提取；查询串用于兼容 Vite 虚拟模块路径。
        /src\/.*\.(vue|[jt]sx?)($|\?)/,
      ],
    },
  },

  presets: [
    // Wind4 是 Tailwind v4 兼容层，负责基础 reset、工具规则、variant、theme CSS 变量和 @property 输出。
    // theme.mode 使用 on-demand：只为实际命中的工具类生成相关变量，避免全量 theme 增大 CSS 体积。
    // createRemToPxProcessor 保持项目 px 设计稿习惯；CSS 中直接使用的字体变量在主题变量文件里声明兜底。
    presetWind4({
      // preflights 控制 Wind4 自动注入的初始化 CSS。
      // Wind4 已内置 Tailwind v4 reset，不需要再引入 @unocss/reset；项目 base.css 只保留项目基础样式。
      preflights: {
        // 显式开启内置 reset：负责浏览器默认样式归一化，例如 margin、box-sizing、表单控件和媒体元素默认行为。
        reset: true,
        // 显式保留 @property 输出：让 Wind4 的 CSS 自定义属性具备类型、继承和初始值声明。
        property: true,
        // theme preflight 负责把命中的 theme token 输出为 CSS 变量。
        theme: {
          // on-demand 只生成实际用到的 token，避免完整 Tailwind theme 变量污染产物。
          mode: 'on-demand',
          // 将 Wind4 生成的 rem token 转为 px，和项目现有设计稿与样式变量单位保持一致。
          process: createRemToPxProcessor(),
        },
      },
    }),

    // Web 字体预设：用 UnoCSS 统一生成远程字体 @font-face 和 font-* 主题 token，替代手写 fonts.css。
    // provider 使用 Bunny，和项目原字体来源保持一致；如需离线/Tauri 内置字体，应改成本地字体处理器或本地 @font-face。
    presetWebFonts({
      provider: 'bunny',
      fonts: {
        // sans 是界面默认字体；只加载 Nunito Sans 全量可用字重，中文字符交给系统中文字体兜底。
        sans: {
          name: 'Nunito Sans',
          weights: [
            '200',
            '300',
            '400',
            '500',
            '600',
            '700',
            '800',
            '900',
          ],
        },
        // mono 用于代码、密钥、日志和数字信息；加载 Fira Code 可用常规字重，满足不同组件的 font-weight 需求。
        mono: {
          name: 'Fira Code',
          weights: ['300', '400', '500', '600', '700'],
        },
      },
    }),

    // 图标预设：本地图标从 src/assets/icons 读取；Iconify 集合使用 `i-集合名-图标名`。
    // 使用方式：<div class="i-svg:logo" />、<div class="i-lucide-home" />。
    // Iconify 图标搜索：https://icon-sets.iconify.design/
    // Iconify 图标集合预览：https://icones.js.org
    // 本地集合名称固定为 svg；新增本地 SVG 后会由 safelist 自动保留对应 `i-svg:文件名` 类名。
    presetIcons({
      // 默认图标按文字尺寸略放大，匹配现有按钮、菜单和信息卡的视觉比例。
      scale: 1.2,
      // 未本地安装的 Iconify 集合可通过 CDN 兜底；离线或内网部署时应优先安装对应 @iconify-json/* 包。
      cdn: 'https://esm.sh/',
      // 保持图标按文本流内联对齐，避免组件里重复补尺寸样式。
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
        'width': '1em',
        'height': '1em',
      },
      // collections 注册自定义图标集合；这里把 src/assets/icons 暴露成 `i-svg:*`。
      collections: {
        // 本地 svg 集合使用 `i-svg:图标名` 调用。
        svg: FileSystemIconLoader(iconsDir, (svg) => {
          // 如果 `fill` 没有定义，则添加 `fill="currentColor"`，让图标颜色跟随文本色和主题变量。
          return svg.includes('fill="')
            ? svg
            : svg.replace(/^<svg /, '<svg fill="currentColor" ')
        }),
      },
    }),
    // 支持属性化写法，例如 `<div flex items-center />`；保留用于兼容已有组件和 demo。
    presetAttributify(),
    // 提供 prose 等正文排版工具，主要用于富文本、Markdown 或说明页内容。
    presetTypography(),

  ],

  // 输出到标准 CSS layer；allLayers 让 UnoCSS 按 resolved layers 主动声明完整默认层级顺序。
  // 项目样式只挂到这些既有 layer 上，避免在样式入口手写 fonts/properties/theme 等内部层名造成版本漂移。
  // 已验证当前 UnoCSS 版本的实际声明顺序：fonts → imports → properties → theme → base → preflights → icons → typography → shortcuts → default。
  // 验证方式：使用 createGenerator(config).generate(..., { preflights: true }) 查看输出 CSS 中的 @layer 声明。
  outputToCssLayers: {
    allLayers: true,
  },

  // 支持项目样式文件中的 @apply、@screen 等 UnoCSS 指令。
  transformers: [
    transformerDirectives(),
  ],

  variants: [
    // 修正 arbitrary data attribute variant 的 CSS 选择器序列化，保证后续 CSS 压缩器可解析。
    dataAttributeVariant,
  ],

  rules: [
    // 补齐 Tailwind v4 圆括号变量简写；若 Wind4 原生匹配这些类名，可删除此规则。
    [
      cssVariableUtilityRE,
      ([, utility, variable]) => ({
        [cssVariableUtilityProperties[utility as CssVariableUtility]]: `var(${variable})`,
      }),
    ],
  ],

  theme: {
    // 颜色 token 只引用 CSS 变量；变量值、暗色主题和品牌语义由 src/assets/styles/theme 下的样式文件维护。
    // 示例中这些文件对应 src/styles/theme.css。
    // 这样 UnoCSS 工具类、组件样式和手写 CSS 共享同一套变量来源，避免两套主题漂移。
    colors: {
      // shadcn-vue 兼容主题 token：保持与组件库语义一致，主题文件必须为每个 token 提供明暗两套 CSS 变量。
      // 页面基础前景/背景色，供 `bg-background`、`text-foreground` 等全局布局类使用。
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      // 卡片容器色，用于信息块、表单块、对话框内部内容等普通承载面。
      card: {
        DEFAULT: 'var(--card)',
        foreground: 'var(--card-foreground)',
      },
      // 浮层容器色，用于 popover、dropdown、tooltip 等脱离普通文档流的界面层。
      popover: {
        DEFAULT: 'var(--popover)',
        foreground: 'var(--popover-foreground)',
      },
      // 主操作色，用于 CTA、当前选中项和关键强调状态。
      primary: {
        DEFAULT: 'var(--primary)',
        foreground: 'var(--primary-foreground)',
      },
      // 次级操作色，用于弱主按钮、次级标签和非主路径操作。
      secondary: {
        DEFAULT: 'var(--secondary)',
        foreground: 'var(--secondary-foreground)',
      },
      // 弱化色，用于说明文字、空态、禁用背景和低优先级信息。
      muted: {
        DEFAULT: 'var(--muted)',
        foreground: 'var(--muted-foreground)',
      },
      // 悬停、聚焦、轻量选中等非主品牌强调色。
      accent: {
        DEFAULT: 'var(--accent)',
        foreground: 'var(--accent-foreground)',
      },
      // 破坏性语义色，属于 shadcn-vue 兼容 token，用于危险操作和错误状态。
      destructive: {
        DEFAULT: 'var(--destructive)',
        // destructive 表示危险/删除等高风险动作；foreground 与背景变量成对维护，保证对比度可控。
        foreground: 'var(--destructive-foreground)',
      },

      // border/input/ring 分别服务边框、表单底色和焦点环；保持拆分，避免交互态互相污染。
      border: 'var(--border)',
      input: 'var(--input)',
      ring: 'var(--ring)',
      // chart 是跨页面复用的数据可视化色板；业务图表只引用语义序号，不直接写具体色值。
      chart: {
        1: 'var(--chart-1)',
        2: 'var(--chart-2)',
        3: 'var(--chart-3)',
        4: 'var(--chart-4)',
        5: 'var(--chart-5)',
      },
      // sidebar 是导航壳层专用色组，和普通 card/popover 分离，避免布局导航色污染内容组件。
      sidebar: {
        // 侧边栏主体背景色，对应 `bg-sidebar`。
        'DEFAULT': 'var(--sidebar)',
        // 侧边栏默认文字色，对应 `text-sidebar-foreground`。
        'foreground': 'var(--sidebar-foreground)',
        // 侧边栏内主操作/当前项高亮色，例如主导航选中态。
        'primary': 'var(--sidebar-primary)',
        // 侧边栏主操作色上的文字色，和 primary 成对保证可读性。
        'primary-foreground': 'var(--sidebar-primary-foreground)',
        // 侧边栏轻量悬停/次级选中背景色，不和全局 accent 混用。
        'accent': 'var(--sidebar-accent)',
        // 侧边栏轻量强调背景上的文字色，和 accent 成对维护。
        'accent-foreground': 'var(--sidebar-accent-foreground)',
        // 侧边栏边界线颜色，用于左右分隔线、分组边框等导航结构。
        'border': 'var(--sidebar-border)',
        // 侧边栏内部可聚焦控件的焦点环颜色。
        'ring': 'var(--sidebar-ring)',
      },

      // 项目自定义语义色：不属于 shadcn-vue 默认主题，主题文件必须在每个明暗主题块底部单独声明。
      // 成功状态色，用于成功提示、完成状态和正向反馈。
      success: {
        DEFAULT: 'var(--success)',
        foreground: 'var(--success-foreground)',
      },
      // 警告状态色，用于风险提示、待处理状态和需要注意的非破坏性反馈。
      warning: {
        DEFAULT: 'var(--warning)',
        foreground: 'var(--warning-foreground)',
      },
    },
    // Wind4 使用 radius key；所有圆角等级从 --radius 派生，保持主题切换时比例一致。
    radius: {
      // 用于大容器、弹窗、卡片等视觉层级最高的圆角。
      xl: 'calc(var(--radius) + 4px)',
      // 默认圆角，和主题变量保持一一对应。
      lg: 'var(--radius)',
      // 用于按钮、输入框等中等控件。
      md: 'calc(var(--radius) - 2px)',
      // 用于 badge、小按钮和紧凑型控件。
      sm: 'calc(var(--radius) - 4px)',
    },

    // presetWebFonts 负责远程字体加载；这里统一声明项目最终使用的字体栈。
    // system-ui 表示当前设备的系统界面字体，sans-serif 是最后兜底的无衬线通用字体。
    font: {
      // sans 是普通界面字体；presetWebFonts 会自动把 Nunito Sans 放到最前面，这里只声明系统字体兜底。
      sans: 'system-ui, sans-serif',
      // serif 在本项目里是“标题/展示字体”语义，不强制使用浏览器衬线字体；远程字体失败时回退到当前设备系统字体。
      serif: '"Nunito Sans", system-ui, sans-serif',
      // mono 是代码、密钥、日志和数字信息字体；presetWebFonts 会自动把 Fira Code 放到最前面，这里只声明系统等宽兜底。
      mono: 'ui-monospace, monospace',
    },
    // monoFont 是 Wind4 reset 给 code/kbd/samp/pre 使用的默认等宽字体配置；font.mono 则是 `font-mono` 工具类使用的字体 token。
    monoFont: {
      // family 把 Wind4 reset 的默认代码字体接到 presetWebFonts 生成的 --font-mono，避免 reset 和工具类使用两套等宽字体。
      family: 'var(--font-mono)',
      // featureSettings 保持 Wind4/Tailwind v4 字体变量契约；未声明专用变量时由 reset 的 fallback 回到 normal。
      featureSettings: 'var(--font-mono--font-feature-settings)',
      // variationSettings 保持 Wind4/Tailwind v4 可变字体变量契约；未声明专用变量时由 reset 的 fallback 回到 normal。
      variationSettings: 'var(--font-mono--font-variation-settings)',
    },
    // 字号 token；当前使用 Wind4 默认值，后续项目级字号只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认字号 token；需要项目级字号时再取消注释并填入实际 token。
    // text: {},
    // 行高 token；当前使用 Wind4 默认值，避免正文和组件行高分成两套来源。
    // 不写空对象，避免覆盖 Wind4 默认行高 token；需要项目级行高时再取消注释并填入实际 token。
    // leading: {},
    // 字距 token；当前使用 Wind4 默认值，后续品牌化标题字距只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认字距 token；需要项目级字距时再取消注释并填入实际 token。
    // tracking: {},
    // 动效曲线 token；当前使用 Wind4 默认值，后续统一动效节奏只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认动效曲线 token；需要项目级动效曲线时再取消注释并填入实际 token。
    // ease: {},
    // 横向响应式断点；Wind4 使用单数 key `breakpoint`，不要写回 Tailwind v3 的 `breakpoints`。
    // 不写空对象，避免覆盖 Wind4 默认断点；空 `breakpoint` 会导致 md/lg 等响应式变体无法生成。
    // breakpoint: {},
    // 纵向响应式断点；用于高度相关布局，当前使用 Wind4 默认值。
    // 不写空对象，避免覆盖 Wind4 默认纵向断点；需要项目级纵向断点时再取消注释并填入实际 token。
    // verticalBreakpoint: {},
    // 外阴影 token；当前使用 Wind4 默认值，后续卡片/浮层阴影只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认外阴影 token；需要项目级外阴影时再取消注释并填入实际 token。
    // shadow: {},
    // 内阴影 token；当前使用 Wind4 默认值，后续内凹状态只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认内阴影 token；需要项目级内阴影时再取消注释并填入实际 token。
    // insetShadow: {},
    // 间距 token；当前使用 Wind4 默认值，不要恢复 extendTheme 补丁，`--spacing(4)` 已由 Wind4 bracket 解析。
    // 不写空对象，避免覆盖 Wind4 默认间距 token；需要项目级间距时再取消注释并填入实际 token。
    // spacing: {},
    // Wind4 @property 相关 token；当前使用默认值，后续自定义 CSS 属性注册只在这里补。
    // 不写空对象，避免覆盖 Wind4 默认 @property token；需要项目级属性注册时再取消注释并填入实际 token。
    // property: {},
  },

  // safelist 只放扫描不到但必须产出的类名。
  // themeUtilitySafelist 用于触发 Wind4 生成被基础 CSS 直接消费的主题变量；generateSafeList 用于本地 SVG 图标集合。
  safelist: [
    ...themeUtilitySafelist,
    ...generateSafeList(),
  ],

})
