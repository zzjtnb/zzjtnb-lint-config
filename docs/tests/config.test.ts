import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))
const docs = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const vitepress = pathToFileURL(require.resolve('vitepress')).href

// 使用真实解析器而非导入配置对象；不启动服务或执行构建。
const script = `
  import { resolveConfig } from ${JSON.stringify(vitepress)}
  const config = await resolveConfig(${JSON.stringify(docs)})
  console.log(JSON.stringify({
    configPath: config.configPath,
    srcDir: config.srcDir,
    outDir: config.outDir,
    lang: config.site.lang,
    lastUpdated: config.lastUpdated,
    search: config.site.themeConfig.search,
    server: config.userConfig.vite.server,
    preview: config.userConfig.vite.preview,
    pwa: config.userConfig.pwa,
  }))
`

describe.each([
  ['仓库根目录', root],
  ['文档目录', docs],
])('文档配置：从%s解析', (_name, cwd) => {
  it('源目录、语言、搜索及端口配置不随调用位置改变', () => {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      cwd,
      encoding: 'utf8',
      timeout: 30_000,
    })
    expect(result.status, result.stderr).toBe(0)
    const config = JSON.parse(result.stdout)
    expect(config.configPath).toBe(resolve(docs, '.vitepress/config.ts'))
    expect(config.srcDir).toBe(resolve(docs, 'src'))
    expect(config.outDir).toBe(resolve(docs, '.vitepress/dist'))
    expect(config.lastUpdated).toBe(true)
    expect(config.server).toMatchObject({ port: 3000, strictPort: true })
    expect(config.preview).toMatchObject({ port: 3000, strictPort: true })
    expect(config.lang).toBe('zh-CN')
    expect(config.search.provider).toBe('local')
    expect(config.search.options.locales.root.translations.button.buttonText).toBe('搜索')
    expect(config.search.options.locales.root.translations.modal.noResultsText).toBe('未找到相关结果')
    expect(config.pwa).toBeUndefined()
  }, 30_000)
})
