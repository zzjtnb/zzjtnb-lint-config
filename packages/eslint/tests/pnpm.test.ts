/** 用真实 ESLint 验证 pnpm 的两项默认差异和消费方最终覆盖权。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import antfu from '@antfu/eslint-config'
import { ESLint } from 'eslint'
import { expect, it } from 'vitest'
import { pnpm } from '../src/configs/pnpm'
import { zzjtnb } from '../src/index'

it.each([
  { name: 'antfu/pnpm/pnpm-workspace-yaml' },
  {
    name: 'antfu/pnpm/pnpm-workspace-yaml',
    rules: { 'pnpm/yaml-enforce-settings': 'error' },
  },
  {
    name: 'antfu/pnpm/pnpm-workspace-yaml',
    rules: {
      'pnpm/yaml-enforce-settings': ['error'],
    },
  },
  {
    name: 'antfu/pnpm/pnpm-workspace-yaml',
    rules: {
      'pnpm/yaml-enforce-settings': ['error', {}],
    },
  },
] satisfies TypedFlatConfigItem[])('上游设置声明变化时报告明确错误：%j', (config) => {
  expect(() => pnpm([config])).toThrow('antfu 的 pnpm settings 配置契约已变化')
})

/** pnpm 规则只处理真实工作区的根文件；隔离目录避免读取或改写仓库的工作区设置。 */
async function workspace() {
  const root = fileURLToPath(new URL('../../../.tmp/pnpm-settings/', import.meta.url))
  await mkdir(root, { recursive: true })
  const cwd = await mkdtemp(join(root, 'consumer-'))
  await writeFile(join(cwd, 'package.json'), JSON.stringify({ name: 'settings-consumer', private: true }))
  await writeFile(join(cwd, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n')
  return cwd
}

it('只去除 trustPolicy 强制值，保留其他上游规则、设置、parser 和文件范围', async () => {
  const options = { pnpm: true, gitignore: false } as const
  const upstream = (await antfu(options).toConfigs()).find(config => config.name === 'antfu/pnpm/pnpm-workspace-yaml')!
  const shared = (await zzjtnb(options)).find(config => config.name === upstream.name)!
  expect(shared.files).toEqual(upstream.files)
  expect(shared.plugins).toEqual(upstream.plugins)
  expect(shared.languageOptions).toEqual(upstream.languageOptions)
  const expected: NonNullable<TypedFlatConfigItem['rules']> = structuredClone(upstream.rules ?? {})
  const inherited = expected['pnpm/yaml-enforce-settings']
  if (!Array.isArray(inherited) || !inherited[1]?.settings)
    throw new Error('缺少上游 pnpm 设置规则')
  delete inherited[1].settings.trustPolicy
  expected['pnpm/yaml-no-duplicate-catalog-item'] = [
    'error',
    { checkDuplicates: 'exact-version' },
  ]
  expect(shared.rules).toEqual(expected)
})

it('默认修复仍写入其他上游设置，trustPolicy 由消费方决定', async () => {
  const cwd = await workspace()
  const engine = new ESLint({
    cwd,
    overrideConfigFile: true,
    fix: true,
    overrideConfig: await zzjtnb({
      pnpm: true,
      gitignore: false,
      defaultIgnores: false,
      ignores: [],
      isInEditor: false,
    }),
  })
  const input = 'packages:\n  - packages/*\n'
  const [result] = await engine.lintText(input, { filePath: 'pnpm-workspace.yaml' })
  expect(result?.output).toContain('shellEmulator: true')
  expect(result?.output).toContain('minimumReleaseAgeExcludePrune: true')
  expect(result?.output).not.toContain('trustPolicy')
  const configured = `${input}\ntrustPolicy: no-downgrade\n`
  const [preserved] = await engine.lintText(configured, { filePath: 'pnpm-workspace.yaml' })
  expect(preserved?.output ?? configured).toContain('trustPolicy: no-downgrade')
})

it.each(['首参 rules', '后续配置'] as const)('%s 可以覆盖本包的两项 pnpm 默认值', async (entry) => {
  const cwd = await workspace()
  const rules = {
    'pnpm/yaml-enforce-settings': [
      'error',
      {
        settings: { trustPolicy: 'no-downgrade' },
      },
    ],
    'pnpm/yaml-no-duplicate-catalog-item': [
      'error',
      { checkDuplicates: 'name-only' },
    ],
  } satisfies NonNullable<TypedFlatConfigItem['rules']>
  const config = entry === '首参 rules'
    ? await zzjtnb({ pnpm: true, gitignore: false, rules })
    : await zzjtnb({ pnpm: true, gitignore: false }, {
        files: ['pnpm-workspace.yaml'],
        rules,
      })
  const engine = new ESLint({
    cwd,
    overrideConfigFile: true,
    overrideConfig: config,
    fix: true,
  })
  const resolved = await engine.calculateConfigForFile('pnpm-workspace.yaml')
  expect(resolved.rules['pnpm/yaml-enforce-settings'][1].settings).toEqual({ trustPolicy: 'no-downgrade' })
  expect(resolved.rules['pnpm/yaml-no-duplicate-catalog-item'][1].checkDuplicates).toBe('name-only')
  const [result] = await engine.lintText('packages:\n  - packages/*\n', { filePath: 'pnpm-workspace.yaml' })
  expect(result?.output).toContain('trustPolicy: no-downgrade')
})
