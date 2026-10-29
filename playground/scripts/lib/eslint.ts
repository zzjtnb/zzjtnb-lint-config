import type { Linter, Rule } from 'eslint'
import type { RuleItem, ToolMetadata } from '../../types'
import { join } from 'node:path'
import { ESLint } from 'eslint'
import { builtinRules } from 'eslint/use-at-your-own-risk'
import { describeConfig } from '../../sandbox/config'
import { root, severity } from '../utils/index'
import { loadDefaults } from './defaults'

const eslintDefaults = loadDefaults('eslint')

/**
 * 解析 eslint 针对虚拟文件的实际配置及规则元数据。
 * @param filename 生成入口允许的虚拟文件名。
 * @returns 静态发布的数据，不包含可执行函数。
 */
export async function inspect(filename: string): Promise<ToolMetadata> {
  const mode = 'eslint' as const
  const target = join(root, 'playground', filename)
  // 插件元数据按 ESLint 原生契约读取；本包返回值额外提供已知规则选项提示。
  const defaults: Linter.Config[] = await eslintDefaults
  const engine = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: defaults })
  const resolved = await engine.calculateConfigForFile(target)
  if (!resolved)
    throw new Error(`ESLint 未解析到 ${filename} 的配置`)
  const configs = defaults.map(describeConfig)
  const definitions = new Map<string, Rule.RuleModule>(builtinRules)
  for (const config of defaults) {
    for (const [prefix, plugin] of Object.entries(config.plugins ?? {})) {
      for (const [name, rule] of Object.entries(plugin.rules ?? {})) {
        if (typeof rule === 'object')
          definitions.set(`${prefix}/${name}`, rule)
      }
    }
  }
  const names = new Set([
    ...definitions.keys(),
    ...Object.keys(resolved.rules ?? {}),
  ])
  const rules = [...names].map((name): RuleItem => {
    const meta = definitions.get(name)?.meta
    const configured = Object.hasOwn(resolved.rules ?? {}, name)
    return {
      name,
      category: name.includes('/')
        ? name.slice(0, name.lastIndexOf('/'))
        : 'eslint',
      description: meta?.docs?.description ?? '',
      files: filename,
      configured,
      status: severity(resolved.rules?.[name]),
      value: JSON.stringify(resolved.rules?.[name] ?? null),
      url: meta?.docs?.url,
      schema: meta?.schema,
      defaultOptions: meta && 'defaultOptions' in meta
        ? meta.defaultOptions
        : undefined,
      fixable: Boolean(meta?.fixable),
      recommended: meta?.docs?.recommended === undefined
        ? undefined
        : Boolean(meta.docs.recommended),
      deprecated: Boolean(meta?.deprecated),
      sources: configs.filter(config => Object.hasOwn(config.rules, name)).map(config => ({
        name: config.name,
        index: config.index,
        files: config.files,
        value: JSON.stringify(config.rules[name]),
      })),
    }
  })
  return {
    mode,
    filename,
    version: ESLint.version,
    rules,
    configs,
  }
}
