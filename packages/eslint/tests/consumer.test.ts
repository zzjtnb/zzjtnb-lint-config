import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { describe, expect, it, vi } from 'vitest'

import { zzjtnb } from '../src/index'

describe('消费项目的 ESLint 配置', () => {
  it('默认沿用上游禁止相对导入 dist，消费方仍可显式覆盖', async () => {
    const source = 'import { value } from \'../dist/index.js\'\nexport { value }\n'
    const defaults = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: false, vue: false }),
    })
    const config = await defaults.calculateConfigForFile('consumer.js')
    expect(config?.rules['antfu/no-import-dist'][0]).toBe(2)
    const [rejected] = await defaults.lintText(source, { filePath: 'consumer.js' })
    expect(rejected?.messages.some(message => message.ruleId === 'antfu/no-import-dist')).toBe(true)

    const consumer = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        vue: false,
        rules: { 'antfu/no-import-dist': 'off' },
      }),
    })
    const [allowed] = await consumer.lintText(source, { filePath: 'consumer.js' })
    expect(allowed?.messages.filter(message => message.ruleId === 'antfu/no-import-dist')).toEqual([])
  })

  it('自动修复保留 TypeScript 三斜线指令，普通注释仍补充空格', async () => {
    const engine = new ESLint({ fix: true, overrideConfigFile: true, overrideConfig: await zzjtnb({ pnpm: false, vue: false }) })
    const directive = '/// <reference types="vite/client" />'
    const [result] = await engine.lintText(`${directive}\n`, { filePath: 'env.d.ts' })
    expect(result?.output ?? `${directive}\n`).toBe(`${directive}\n`)
    const [ordinary] = await engine.lintText('//comment\nexport const value = 1\n', { filePath: 'sample.ts' })
    expect(ordinary?.output).toContain('/** comment */')
  })

  it('nestJS 文件显式启用元数据策略，普通文件继续修复类型导入', async () => {
    const engine = new ESLint({ fix: true, overrideConfigFile: true, overrideConfig: await zzjtnb(
      { pnpm: false, vue: false },
      {
        files: ['app.controller.ts'],
        languageOptions: {
          parserOptions: { experimentalDecorators: true, emitDecoratorMetadata: true },
        },
      },
    ) })
    const ordinaryConfig = await engine.calculateConfigForFile('shape.ts')
    expect(ordinaryConfig?.languageOptions.parserOptions.experimentalDecorators).not.toBe(true)
    expect(ordinaryConfig?.languageOptions.parserOptions.emitDecoratorMetadata).not.toBe(true)
    const [decorated] = await engine.lintText(`import { Controller } from '@nestjs/common'
import { AppService } from './app.service.js'
@Controller()
export class AppController {
  constructor(private readonly service: AppService) {}
}
`, { filePath: 'app.controller.ts' })
    expect(decorated?.fatalErrorCount).toBe(0)
    expect(decorated?.output).not.toContain('import type { AppService }')
    const [ordinary] = await engine.lintText('import { Shape } from \'./shape.js\'\nexport function area(shape: Shape) { return shape.area }\n', { filePath: 'shape.ts' })
    expect(ordinary?.output).toContain('import type { Shape }')
  })

  it('nestJS 类型感知从所属项目读取装饰器选项，模板不进入项目检查', async () => {
    const parent = fileURLToPath(new URL('../../../.tmp/eslint-nest/', import.meta.url))
    await mkdir(parent, { recursive: true })
    const directory = await mkdtemp(join(parent, 'consumer-'))
    const gateway = join(directory, 'apps/gateway')
    await mkdir(gateway, { recursive: true })
    await writeFile(join(directory, 'tsconfig.json'), '{"files":[]}')
    await writeFile(join(gateway, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { experimentalDecorators: true, emitDecoratorMetadata: true, strict: true },
      include: ['*.ts'],
    }))
    await writeFile(join(gateway, 'service.ts'), 'export class Service { value = 1 }\n')
    const source = `import { Service } from './service'
function Controller(): ClassDecorator {
  return () => {}
}
@Controller()
export class AppController {
  constructor(readonly service: Service) {}
}
`
    await writeFile(join(gateway, 'controller.ts'), source)
    const engine = new ESLint({
      cwd: directory,
      fix: true,
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        vue: false,
        gitignore: false,
        defaultIgnores: false,
        typescript: {
          tsconfigPath: join(gateway, 'tsconfig.json'),
          filesTypeAware: ['apps/gateway/**/*.ts'],
          parserOptions: { tsconfigRootDir: directory },
        },
      }),
    })
    const config = await engine.calculateConfigForFile(join(gateway, 'controller.ts'))
    expect(config?.languageOptions.parserOptions.experimentalDecorators).toBeUndefined()
    expect(config?.languageOptions.parserOptions.emitDecoratorMetadata).toBeUndefined()
    expect(config?.rules['ts/no-floating-promises']?.[0]).toBe(2)
    const [result] = await engine.lintText(source, {
      filePath: join(gateway, 'controller.ts'),
    })
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages).toEqual([])
    expect(result?.output ?? source).not.toContain('import type { Service }')
    for (const file of ['shape.ts', 'cli/gateway/template.ts']) {
      const config = await engine.calculateConfigForFile(join(directory, file))
      expect(config?.languageOptions.parserOptions.projectService).toBeUndefined()
      const [ordinary] = await engine.lintText('import { Shape } from \'./shape\'\nexport function area(shape: Shape) { return shape.area }\n', {
        filePath: join(directory, file),
      })
      expect(ordinary?.fatalErrorCount).toBe(0)
      expect(ordinary?.output).toContain('import type { Shape }')
    }
  })

  it('真实引擎检查合法的 TypeScript 消费代码', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: false, vue: false }),
    })
    // 使用虚拟消费路径，避免测试目录的忽略策略掩盖实际检查。
    const [result] = await eslint.lintText('export const fixture = \'@zzjtnb/eslint-config\'\n', { filePath: 'consumer.ts' })
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages).toEqual([])
  }, 30_000)

  // 首次加载完整语言插件并解析 Vue 文件需要更长的冷启动时间。
  it('允许在首个选项对象中关闭共享 Vue 规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        rules: { 'vue/require-default-prop': 'off' },
      }),
    })

    const config = await eslint.calculateConfigForFile('sample.vue')
    expect(config?.rules['vue/require-default-prop'][0]).toBe(0)

    const [result] = await eslint.lintText(
      '<script setup lang="ts">\ndefineProps<{ label?: string }>()\n</script>\n<template>\n  <span>{{ label }}</span>\n</template>\n',
      { filePath: 'sample.vue' },
    )
    expect(result?.fatalErrorCount).toBe(0)
    expect(result?.messages.filter(message => message.ruleId === 'vue/require-default-prop')).toEqual([])
  }, 30_000)

  it('自动修复时保留 TOML Schema 指令，其他语言仍检查注释空格', async () => {
    const directive = '#:schema https://developers.openai.com/codex/config-schema.json'
    const input = `${directive}\nmodel = "example"\n`
    const eslint = new ESLint({
      fix: true,
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({ pnpm: false, vue: false }),
    })

    const [result] = await eslint.lintText(input, { filePath: 'schema-example.toml' })
    expect(result?.fatalErrorCount).toBe(0)
    const output = result?.output ?? input
    expect(output.split('\n')[0]).toBe(directive)
    const [secondPass] = await eslint.lintText(output, { filePath: 'schema-example.toml' })
    expect(secondPass?.output ?? output).toBe(output)

    const [javascript] = await eslint.lintText('//example\nexport const value = 1\n', { filePath: 'schema-example.js' })
    expect(javascript?.output?.split('\n')[0]).toBe('/** example */')
  }, 30_000)

  it('允许覆盖 TOML 指令注释的默认规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        vue: false,
        rules: { 'toml/spaced-comment': 'error' },
      }),
    })

    const config = await eslint.calculateConfigForFile('sample.toml')
    expect(config?.rules['toml/spaced-comment'][0]).toBe(2)
  })

  it.each([
    ['javascript', 'sample.js', 'no-console'],
    ['vue', 'sample.vue', 'vue/require-default-prop'],
    ['toml', 'sample.toml', 'toml/spaced-comment'],
  ] as const)('保留上游 %s 选项中的规则覆盖优先级', async (language, filename, rule) => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        [language]: {
          overrides: { [rule]: 'error' },
        },
      }),
    })

    const config = await eslint.calculateConfigForFile(filename)
    expect(config?.rules[rule][0]).toBe(2)
  })

  it('首参 rules 高于语言对象覆盖，未被覆盖的其他语言仍保留自身选择', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb({
        pnpm: false,
        vue: {
          overrides: { 'vue/require-default-prop': 'off' },
        },
        toml: {
          overrides: { 'toml/spaced-comment': 'off' },
        },
        rules: { 'vue/require-default-prop': 'warn' },
      }),
    })

    const vue = await eslint.calculateConfigForFile('sample.vue')
    expect(vue?.rules['vue/require-default-prop'][0]).toBe(1)
    const toml = await eslint.calculateConfigForFile('sample.toml')
    expect(toml?.rules['toml/spaced-comment'][0]).toBe(0)
  })

  it('没有 pnpm-workspace.yaml 的项目默认不启用 pnpm 集成，仍能检查 package.json', async () => {
    // 判断依据是向上查找工作区文件，必须在仓库之外的临时目录验证，仓库自身存在该文件。
    const directory = await mkdtemp(join(tmpdir(), 'lint-npm-consumer-'))
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(directory)
    try {
      const config = await zzjtnb()
      const eslint = new ESLint({ cwd: directory, overrideConfigFile: true, overrideConfig: config })
      const resolved = await eslint.calculateConfigForFile(join(directory, 'package.json'))
      expect(Object.keys(resolved?.rules ?? {}).filter(name => name.startsWith('pnpm/'))).toEqual([])

      const [result] = await eslint.lintText('{\n  "name": "npm-consumer",\n  "version": "1.0.0"\n}\n', {
        filePath: join(directory, 'package.json'),
      })
      expect(result?.fatalErrorCount).toBe(0)
      expect(result?.messages.filter(message => message.ruleId?.startsWith('pnpm/'))).toEqual([])
    }
    finally {
      cwd.mockRestore()
      await rm(directory, { force: true, recursive: true })
    }
  }, 30_000)

  it('后续 Flat Config 片段仍可覆盖首个选项对象中的规则', async () => {
    const eslint = new ESLint({
      overrideConfigFile: true,
      overrideConfig: await zzjtnb(
        {
          pnpm: false,
          rules: { 'vue/require-default-prop': 'off' },
        },
        {
          files: ['**/*.vue'],
          rules: { 'vue/require-default-prop': 'error' },
        },
      ),
    })

    const config = await eslint.calculateConfigForFile('sample.vue')
    expect(config?.rules['vue/require-default-prop'][0]).toBe(2)
  })
})

it('显式关闭 Vue 时不加载 Vue 配置和无障碍插件', async () => {
  const config = await zzjtnb({ vue: false, pnpm: false })
  expect(config.some(item => item.name?.startsWith('antfu/vue/'))).toBe(false)
  expect(config.some(item => item.plugins?.['vue-a11y'])).toBe(false)
})
