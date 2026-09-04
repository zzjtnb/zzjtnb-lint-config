import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import config from '../.vitepress/config.ts'

beforeEach(() => {
  vi.stubEnv('PLAYGROUND_URL', undefined)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('工作台环境配置', () => {
  it('从文档项目的 .env.development 读取开发工作台地址', () => {
    const settings = config({ command: 'serve', mode: 'development' })
    expect(settings.themeConfig!.nav).toContainEqual({ text: 'Playground', link: 'http://localhost:3001/' })
    expect(settings.themeConfig!.sidebar).toBeDefined()
  })

  it('生产文件未提供地址时不生成本机或说明页冒充的在线入口', () => {
    const settings = config({ command: 'build', mode: 'production' })
    expect(settings.themeConfig!.nav?.some(item => 'link' in item && /localhost|playground/.test(String(item.link)))).toBe(false)
  })

  it.each(['development', 'production'])('进程变量覆盖 %s 环境文件', (mode) => {
    const link = 'https://playground.example.test/'
    vi.stubEnv('PLAYGROUND_URL', link)
    const settings = config({
      command: mode === 'production'
        ? 'build'
        : 'serve',
      mode,
    })
    expect(settings.themeConfig!.nav).toContainEqual({ text: 'Playground', link })
  })

  it('显式空进程变量可以关闭开发入口，不被文件默认值覆盖', () => {
    vi.stubEnv('PLAYGROUND_URL', '')
    const settings = config({ command: 'serve', mode: 'development' })
    expect(settings.themeConfig!.nav?.some(item => 'text' in item && item.text === 'Playground')).toBe(false)
  })

  it.each(['not-a-url', 'javascript:alert(1)', 'file:///tmp/playground'])('拒绝非 HTTP/HTTPS 地址：%s', (link) => {
    vi.stubEnv('PLAYGROUND_URL', link)
    expect(() => config({ command: 'build', mode: 'production' })).toThrow()
  })
})
