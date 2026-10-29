import type { Rule } from 'stylelint'
import type { RuleItem, ToolMetadata } from '../../types'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import stylelint from 'stylelint'
import { require, root } from '../utils/index'
import { loadDefaults } from './defaults'

const stylelintDefaults = loadDefaults('stylelint')

/**
 * 解析 stylelint 针对虚拟文件的实际配置及规则元数据。
 * @param filename 生成入口允许的虚拟文件名。
 * @returns 静态发布的数据，不包含可执行函数。
 */
export async function inspect(filename: string): Promise<ToolMetadata> {
  const mode = 'stylelint' as const
  const target = join(root, 'playground', filename)
  const resolved = await stylelint.resolveConfig(target, {
    config: await stylelintDefaults,
  })
  if (!resolved)
    throw new Error(`Stylelint 未解析到 ${filename} 的配置`)
  const definitions = new Map<string, Rule>()
  for (const [name, pending] of Object.entries(stylelint.rules))
    definitions.set(name, await pending)
  const entries = Array.isArray(resolved.plugins)
    ? resolved.plugins
    : Object.values(resolved.plugins ?? {})
  for (const entry of entries) {
    const loaded = typeof entry === 'string'
      ? await import(pathToFileURL(entry).href)
      : entry
    const plugins = loaded.default ?? loaded
    for (const plugin of Array.isArray(plugins)
      ? plugins
      : [plugins]) {
      if (plugin && typeof plugin === 'object' && 'ruleName' in plugin)
        definitions.set(plugin.ruleName, plugin.rule)
    }
  }
  const names = new Set([
    ...definitions.keys(),
    ...Object.keys(resolved.rules ?? {}),
  ])
  const rules = [...names].map((name): RuleItem => {
    const value = resolved.rules?.[name]
    const [primary, secondary] = Array.isArray(value)
      ? value
      : [value]
    const definition = definitions.get(name)
    const meta = definition?.meta
    return {
      name,
      category: name.includes('/')
        ? name.slice(0, name.lastIndexOf('/'))
        : 'stylelint',
      description: meta && 'description' in meta && typeof meta.description === 'string'
        ? meta.description
        : '',
      files: filename,
      configured: Object.hasOwn(resolved.rules ?? {}, name),
      status: primary == null || primary === false
        ? 'off'
        : (secondary?.severity ?? resolved.defaultSeverity) === 'warning'
            ? 'warn'
            : 'error',
      value: JSON.stringify(value ?? null),
      url: meta?.url ?? (name.includes('/')
        ? undefined
        : `https://stylelint.io/user-guide/rules/${name}`),
      fixable: Boolean(meta?.fixable),
      deprecated: Boolean(meta?.deprecated),
      sources: [],
    }
  })
  return {
    mode,
    filename,
    version: JSON.parse(await readFile(require.resolve('stylelint/package.json'), 'utf8')).version,
    rules,
    configs: [
      {
        name: '@zzjtnb/stylelint-config · 最终解析配置',
        index: 1,
        files: [filename],
        ignores: [],
        rules: resolved.rules ?? {},
      },
    ],
  }
}
