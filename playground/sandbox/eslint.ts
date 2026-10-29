import type { Linter } from 'eslint'
import type { SandboxRequest, SandboxResult } from '../protocol.ts'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ConfigArray } from '@eslint/config-array'
import { ESLint } from 'eslint'
import { describeConfig } from './config.ts'

/**
 * 修正已复现的 WebContainer Promise 子类实例判断差异，仅在检测到异常时启用。
 * @returns 完成兼容检测；不修改规则或第三方文件。
 */
async function compatibility() {
  const local = createRequire(import.meta.url)
  const antfu = local.resolve('@antfu/eslint-config', {
    paths: [
      fileURLToPath(import.meta.resolve('@zzjtnb/eslint-config')),
    ],
  })
  const require = createRequire(antfu)
  const { FlatConfigComposer } = await import(pathToFileURL(require.resolve('eslint-flat-config-utils')).href)
  if (Promise.resolve() instanceof FlatConfigComposer)
    Object.defineProperty(FlatConfigComposer, Symbol.hasInstance, { value: Function.prototype[Symbol.hasInstance] })
}

/**
 * 用完整配置检查虚拟文件，不执行被检查源码。
 * @param request 当前文件、配置与操作。
 * @param url 沙箱内已经保存的配置模块地址。
 * @returns 最终规则、原始声明及真实诊断。
 */
export async function execute(request: SandboxRequest, url: string): Promise<SandboxResult> {
  await compatibility()
  const { default: loaded } = await import(url)
  const base = await loaded as Linter.Config | Linter.Config[]
  const configs = [
    ...(Array.isArray(base)
      ? base
      : [base]),
    { name: 'playground/overrides', rules: request.overrides as Linter.RulesRecord },
  ]
  const engine = new ESLint({
    overrideConfigFile: true,
    overrideConfig: configs,
    fix: request.action === 'fix',
    stats: request.action === 'stats',
  })
  const ignored = await engine.isPathIgnored(request.filename)
  const resolved = ignored
    ? undefined
    : await engine.calculateConfigForFile(request.filename)
  const results = ['inspect', 'files'].includes(request.action) || ignored
    ? []
    : await engine.lintText(request.source, { filePath: request.filename })
  const result = results[0]
  const matching = new ConfigArray([
    {
      files: ['**/*'],
      trace: [],
    },
    ...configs.map((item, index) => {
      const onlyIgnores = Object.keys(item).every(key => ['name', 'ignores', 'basePath'].includes(key))
      return {
        ...(item.name
          ? { name: item.name }
          : {}),
        ...(item.files
          ? { files: item.files }
          : {}),
        ...(item.ignores
          ? { ignores: item.ignores }
          : {}),
        ...('basePath' in item
          ? { basePath: item.basePath }
          : {}),
        ...(onlyIgnores
          ? {}
          : {
              trace: [index + 1],
            }),
      }
    }),
  ], {
    basePath: process.cwd(),
    schema: {
      trace: {
        merge: (a: number[] = [], b: number[] = []) => [
          ...a,
          ...b,
        ],
        validate: 'array',
      },
    },
  })
  await matching.normalize()
  const matched = matching.getConfig(resolve(request.filename))?.trace as number[] | undefined
  const passes = result?.stats?.times.passes
  const performance = passes
    ? passes.reduce((sum, pass) => ({
        rules: sum.rules + Object.values(pass.rules ?? {}).reduce((total, rule) => total + rule.total, 0),
        parse: sum.parse + (pass.parse?.total ?? 0),
        fix: sum.fix + pass.fix.total,
        total: sum.total + pass.total,
      }), { rules: 0, parse: 0, fix: 0, total: 0 })
    : undefined
  return {
    rules: resolved?.rules ?? {},
    configs: configs.map(describeConfig),
    ignored,
    matchedConfigs: ignored
      ? []
      : matched ?? [],
    performance,
    messages: (result?.messages ?? []).map(message => ({
      rule: message.ruleId ?? undefined,
      message: message.message,
      severity: message.severity === 2
        ? 'error'
        : 'warning',
      line: message.line,
      column: message.column,
      endLine: message.endLine,
      endColumn: message.endColumn,
    })),
    output: result?.output ?? request.source,
    duration: 0,
    timings: result?.stats?.times.passes.flatMap((pass, index) => Object.entries(pass.rules ?? {}).map(([name, timing]) => ({
      name: `第 ${index + 1} 轮 · ${name}`,
      milliseconds: timing.total,
      rule: name,
      plugin: name.includes('/')
        ? name.slice(0, name.lastIndexOf('/'))
        : 'eslint',
      filename: request.filename,
    }))),
  }
}
