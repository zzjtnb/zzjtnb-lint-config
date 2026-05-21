/**
 * UnoCSS 独立配置（不使用插件）
 * 基于 backup 目录的 shadcn-vue 主题数据
 * 用于验证配置正确性，后续再封装为插件
 *
 * Iconify 图标集合预览  https://icones.js.org
 * UnoCSS 官方教程  https://tutorial.unocss.dev/
 * UnoCSS 官方 Playground https://unocss.dev/playground
 */
import { existsSync, readdirSync } from 'node:fs'
import { FileSystemIconLoader } from '@iconify/utils/lib/loader/node-loaders'

import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind4,
  transformerDirectives,
} from 'unocss'

// 本地SVG图标目录
const iconsDir = './src/assets/icons'

// 读取本地 SVG 目录，自动生成 safelist
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

// shadcn-vue 新版组件使用 Tailwind v4 的 `w-(--sidebar-width)` 这类 CSS 变量简写。
// 当前 UnoCSS 66 的 presetWind4 尚未原生生成这些圆括号变量工具类，因此在配置层做最小兼容，不改三方组件源码。
const cssVariableUtilityProperties = {
  'bg': 'background-color',
  'border': 'border-color',
  'max-h': 'max-height',
  'max-w': 'max-width',
  'origin': 'transform-origin',
  'w': 'width',
}

export default defineConfig({
  // 默认情况下，`.ts` 和 `.js` 文件不会被提取。
  // 这里显式包含 src 下的 ts/js/vue，兼容 shadcn-vue 在 cva 中声明的类名。
  // ⚠️ 修改后如样式异常，可清理缓存：rm -rf node_modules/.cache/unocss node_modules/.vite
  content: {
    pipeline: {
      include: [
        /index\.html$/,
        /src\/.*\.(vue|[jt]sx?)($|\?)/,
      ],
    },
  },

  // 预设配置
  presets: [
    // Wind4 预设 - Tailwind CSS v4 兼容层
    // ✅ 支持现代 CSS 特性（color-mix()、@property 声明等）
    // ✅ reset/property 使用官方默认行为
    // ✅ theme 使用默认 on-demand（更轻量）
    //    对于在 CSS 中直接使用的字体变量（如 --font-serif），在变量文件中手动声明兜底
    presetWind4(),

    // 图标预设 - 支持纯 CSS 图标
    // 优先使用本地安装的 @iconify-json/* 包，无需网络请求
    // 使用方式：<div class="i-ri-github-fill" /> 或 <div class="i-ri-heart-fill" />
    // 图标搜索：https://icon-sets.iconify.design/
    presetIcons({
      // 额外属性
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
        'width': '1em',
        'height': '1em',
      },
      // 图表集合
      collections: {
        // svg 是图标集合名称，使用 `i-svg:图标名` 调用
        svg: FileSystemIconLoader(iconsDir, (svg) => {
          // 如果 `fill` 没有定义，则添加 `fill="currentColor"`
          return svg.includes('fill="') ? svg : svg.replace(/^<svg /, '<svg fill="currentColor" ')
        }),
      },
    }),
    presetAttributify(),
    presetTypography(),

  ],

  // 启用 CSS @layer 输出（推荐开启）
  // ✅ 更好的样式隔离 - CSS @layer 提供标准的层叠控制，避免样式冲突
  // ✅ 便于第三方样式集成 - 可以精确控制不同来源样式的优先级
  // 层级顺序由 src/assets/styles/index.css 中的 @layer 声明控制
  outputToCssLayers: true,

  // 转换器 - 支持 @apply、@screen 等指令
  transformers: [transformerDirectives()],

  rules: [
    // 仅覆盖当前源码实际出现的 Tailwind v4 圆括号 CSS 变量简写；若 UnoCSS 后续原生支持，可删除这一条。
    [/^(bg|border|max-h|max-w|origin|w)-\((--[\w-]+)\)$/, ([, utility, variable]) => ({
      [cssVariableUtilityProperties[utility]]: `var(${variable})`,
    })],
  ],

  // 主题配置
  theme: {
    // 颜色系统 - 使用完整 CSS 颜色变量
    // ✅ 与 shadcn-vue 官方 CSS 变量顺序完全一致
    // ✅ 主题文件已提供完整 oklch(...) 值，这里直接引用变量
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      card: {
        DEFAULT: 'var(--card)',
        foreground: 'var(--card-foreground)',
      },
      popover: {
        DEFAULT: 'var(--popover)',
        foreground: 'var(--popover-foreground)',
      },
      primary: {
        DEFAULT: 'var(--primary)',
        foreground: 'var(--primary-foreground)',
      },
      secondary: {
        DEFAULT: 'var(--secondary)',
        foreground: 'var(--secondary-foreground)',
      },
      muted: {
        DEFAULT: 'var(--muted)',
        foreground: 'var(--muted-foreground)',
      },
      accent: {
        DEFAULT: 'var(--accent)',
        foreground: 'var(--accent-foreground)',
      },
      destructive: {
        DEFAULT: 'var(--destructive)',
        // shadcn-vue 当前主题变量集中未定义 destructive-foreground，
        // 这里复用现有前景色变量，确保 destructive 按钮文字对比度可读
        foreground: 'var(--primary-foreground)',
      },
      border: 'var(--border)',
      input: 'var(--input)',
      ring: 'var(--ring)',
      chart: {
        1: 'var(--chart-1)',
        2: 'var(--chart-2)',
        3: 'var(--chart-3)',
        4: 'var(--chart-4)',
        5: 'var(--chart-5)',
      },
      sidebar: {
        'DEFAULT': 'var(--sidebar)',
        'foreground': 'var(--sidebar-foreground)',
        'primary': 'var(--sidebar-primary)',
        'primary-foreground': 'var(--sidebar-primary-foreground)',
        'accent': 'var(--sidebar-accent)',
        'accent-foreground': 'var(--sidebar-accent-foreground)',
        'border': 'var(--sidebar-border)',
        'ring': 'var(--sidebar-ring)',
      },
    },
    // 圆角配置 - 基于 CSS 变量 --radius 计算（Wind4 使用 radius 而非 borderRadius）
    radius: {
      xl: 'calc(var(--radius) + 4px)',
      lg: 'var(--radius)',
      md: 'calc(var(--radius) - 2px)',
      sm: 'calc(var(--radius) - 4px)',
    },

    font: {
      sans: ['Nunito Sans', 'LXGW WenKai Mono Screen', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      serif: ['Nunito Sans', 'Ma Shan Zheng', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      mono: ['Fira Code', 'monospace', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      handwriting: ['Nunito Sans', 'Liu Jian Mao Cao', 'cursive'],
    },

  },

  // 兼容 shadcn-vue Sidebar 中的 theme(spacing.4) 写法
  // 使用 extendTheme 保留预设默认 token，仅补齐缺失项
  extendTheme: (theme) => {
    const spacing = 'spacing' in theme && typeof theme.spacing === 'object' ? theme.spacing : {}

    return {
      ...theme,
      spacing: {
        ...spacing,
        4: '1rem',
      },
    }
  },
  safelist: [
    ...generateSafeList(),
  ],

})
