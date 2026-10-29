import { defineConfig, presetIcons, presetWebFonts, presetWind4 } from 'unocss'

export default defineConfig({
  // 对齐 Docs 的 VitePress 默认字体栈；字体定义由 UnoCSS 统一持有。
  theme: {
    // 统一维护界面与代码字体栈；远程字体不可用时按顺序使用后续系统字体。
    font: {
      // 无衬线界面字体；此值决定 font-sans 或对应远程字体映射。
      sans: '\'Inter\', -apple-system, BlinkMacSystemFont, sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'',
      // 代码与日志的等宽字体；此值决定 font-mono 或对应远程字体映射。
      mono: 'ui-monospace, \'Menlo\', \'Monaco\', \'Consolas\', \'Liberation Mono\', \'Courier New\', monospace',
    },
  },
  // reset 也消费等宽字体变量，不能仅依赖模板中的 font-mono 类触发生成。
  safelist: ['font-sans', 'font-mono'],
  // 启用所列 UnoCSS 预设；其默认规则由预设提供，本项目只覆盖明确列出的选项。
  presets: [
    presetWebFonts({
      // 从 google 字体服务生成远程字体样式请求。
      provider: 'google',
      // 指定远程字体族与加载参数，仅对字体预设生效。
      fonts: {
        // 无衬线界面字体；此值决定 font-sans 或对应远程字体映射。
        sans: {
          // 远程字体服务中的字体族名称，需与该服务的可用字体一致。
          name: 'Inter',
          // 只请求列出的字重；可变字体范围按字体服务支持的区间语法书写。
          weights: ['100..900'],
          // 同时请求斜体字形；仅在远程字体服务提供该字形时生效。
          italic: true,
        },
      },
      // 保留与 Docs 一致的回退栈；由浏览器请求字体服务，不在构建时下载。
      extendTheme: false,
      // 不在构建时内联下载字体 CSS，由浏览器按生成的导入规则请求。
      inlineImports: false,
    }),
    presetIcons({
      // 构建时读取本地集合，只输出模板使用的图标，不依赖运行时图标请求。
      collections: {
        // 从本地安装的 Lucide 集合读取图标，仅将实际使用的图标编译为 CSS。
        lucide: () => import('@iconify-json/lucide').then(module => module.icons),
      },
      // 为生成的图标工具类补充这些 CSS 声明，避免在模板逐处重复。
      extraProperties: {
        // 使用行内块级布局，使图标保留自身尺寸并参与文本行布局。
        'display': 'inline-block',
        // 禁止图标在 Flex 空间不足时被压缩。
        'flex-shrink': '0',
        // 将行内图标与周围文字垂直居中对齐。
        'vertical-align': 'middle',
      },
    }),
    presetWind4(),
  ],
})
