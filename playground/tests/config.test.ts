import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { resolveConfig } from 'vite'
import { describe, expect, it } from 'vitest'

import manifest from '../package.json' with { type: 'json' }

const root = fileURLToPath(new URL('../', import.meta.url)).replace(/\/$/, '')
const configFile = fileURLToPath(new URL('../vite.config.ts', import.meta.url))

describe('工作台工程配置', () => {
  it.each(['serve', 'build'] as const)('%s 配置始终定位工作台，Node.js API 仅进入开发配置', async (command) => {
    // 仅解析配置，不调用 build、不启动服务器，也不执行构建生命周期。
    const config = await resolveConfig({ configFile }, command)
    expect(config.root).toBe(root)
    expect(config.plugins.some(plugin => plugin.name === 'playground-api')).toBe(command === 'serve')
    expect(config.server.host).toBe(true)
    // 固定端口并禁止静默顺延，才能与文档站同时启动且调试地址可预期。
    expect(config.server).toMatchObject({ port: 3001, strictPort: true })
    expect(config.preview).toMatchObject({ port: 3001, strictPort: true })
    // 首次解析会加载三套真实 lint 引擎，使用配置加载测试的独立超时预算。
  }, 20_000)

  it('一个类型入口覆盖源码与测试，检查时不构建公开包或引入后台业务全局类型', () => {
    const path = fileURLToPath(new URL('../tsconfig.json', import.meta.url))
    const source = ts.readConfigFile(path, ts.sys.readFile)
    expect(source.error).toBeUndefined()
    const config = ts.parseJsonConfigFileContent(source.config, ts.sys, root)
    expect(config.errors).toEqual([])
    expect(config.options.noEmit).toBe(true)
    expect(config.options.types).toEqual(['vite/client', 'node'])
    expect(config.options.paths).toEqual({
      '@zzjtnb/eslint-config': ['../packages/eslint-config/src/index.ts'],
      '@zzjtnb/stylelint-config': ['../packages/stylelint-config/src/index.ts'],
    })
    expect(config.fileNames).toEqual(expect.arrayContaining([
      `${root}/src/main.ts`,
      `${root}/plugins/engine.ts`,
      `${root}/vite.config.ts`,
      `${root}/tests/engine.test.ts`,
    ]))
    expect(manifest.scripts.typecheck).toBe('vue-tsc --noEmit -p tsconfig.json')
    expect(manifest.scripts).not.toHaveProperty('pretypecheck')
    expect(manifest.devDependencies).not.toHaveProperty('@zzjtnb/types')
  })
})
