// 这个文件用来验证 uno.config.ts 的配置是否按预期工作，由根目录的 Vitest 运行：
//   pnpm exec vitest run apps/demo/tests --project unit
// 读法：每个 it(...) 是一条测试，括号里的中文是它要证明的事；expect(...) 是具体的判断。
import { createGenerator } from 'unocss'
import { describe, expect, it } from 'vitest'

import config from '../uno.config'

// 用 UnoCSS 的正式生成器处理一段“源码文本”，返回它生成的 CSS 和命中的类名。
// preflights 设为 false：只看工具类本身的输出，不生成重置样式和字体，因此不需要联网。
// safelist 默认开启，所以 matched 里始终包含 uno.config.ts 保留的本地图标类名。
async function generate(code: string, options: { safelist?: boolean } = {}) {
  const uno = await createGenerator(config)
  return uno.generate(code, { preflights: false, ...options })
}

describe('消费示例的 UnoCSS 配置', () => {
  it('颜色 token 引用主题 CSS 变量而不是固定色值', async () => {
    // 这三个类名都来自 theme.colors；matched 记录了被 UnoCSS 认出来的类名。
    const { css, matched } = await generate('bg-primary text-primary-foreground border-border')
    for (const name of ['bg-primary', 'border-border', 'text-primary-foreground'])
      expect(matched.has(name)).toBe(true)
    // 生成的 CSS 里应当是 var(--primary) 这样的变量引用，真实颜色由 theme.css 决定。
    expect(css).toContain('var(--primary)')
    expect(css).toContain('var(--primary-foreground)')
    expect(css).toContain('var(--border)')
  })

  it('补充主题组：侧边栏、图表与浮层同样引用 CSS 变量', async () => {
    const { css, matched } = await generate('bg-sidebar text-sidebar-foreground bg-chart-1 bg-popover')
    for (const name of [
      'bg-sidebar',
      'text-sidebar-foreground',
      'bg-chart-1',
      'bg-popover',
    ])
      expect(matched.has(name)).toBe(true)
    expect(css).toContain('var(--sidebar)')
    expect(css).toContain('var(--chart-1)')
  })

  it('补齐 Wind4 缺少的圆括号 CSS 变量简写', async () => {
    // `max-w-(--badge-max-width)` 是 Tailwind v4 的写法，等价于 max-w-[var(--badge-max-width)]。
    // 它由 uno.config.ts 里的自定义 rules 补齐。
    const { css, matched } = await generate('max-w-(--badge-max-width) w-(--panel-width)')
    for (const name of ['max-w-(--badge-max-width)', 'w-(--panel-width)'])
      expect(matched.has(name)).toBe(true)
    expect(css).toContain('max-width:var(--badge-max-width)')
    expect(css).toContain('width:var(--panel-width)')
  })

  it('data 属性变体把属性值序列化为带引号的合法选择器', async () => {
    // `data-[status=success]:bg-success` 的意思是“元素带有 data-status="success" 时应用 bg-success”。
    // 带引号才是合法 CSS；数字值如 data-[spacing=0] 不加引号会被严格的 CSS 解析器拒绝。
    const { css } = await generate('data-[status=success]:bg-success data-[spacing=0]:p-0')
    expect(css).toContain('[data-status="success"]')
    expect(css).toContain('[data-spacing="0"]')
  })

  it('本地 SVG 图标以 i-svg 集合提供', async () => {
    // `i-svg:logo` 对应 src/assets/icons/logo.svg 本地图标。
    const { css, matched } = await generate('i-svg:logo')
    expect(matched.has('i-svg:logo')).toBe(true)
    expect(css).toContain('i-svg\\:logo')
  })

  it('字体栈统一来自 theme.font，并通过 safelist 保留 font-serif', async () => {
    // 源码里一个 font-serif 都没写，它仍然被保留，因为 base.css 直接使用了 --font-serif。
    const { matched } = await generate('')
    expect(matched.has('font-serif')).toBe(true)
  })

  it('safelist 保留全部本地图标，即使源码没有引用', async () => {
    // 传入空字符串表示“没有任何源码”，图标依然出现，说明它们来自 safelist。
    const { css } = await generate('', { safelist: true })
    for (const name of ['logo', 'check', 'warning'])
      expect(css).toContain(`i-svg\\:${name}`)
  })
})
