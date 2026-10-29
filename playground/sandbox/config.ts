import type { Linter } from 'eslint'
import type { ConfigItem } from '../types.ts'

/**
 * 把配置声明转成可展示的数据，函数与解析器只描述身份，不伪造可执行 JSON。
 * @param config 引擎原始声明。
 * @param index 声明位置，从零开始。
 * @returns 保留文件、插件、语言、处理器、设置与规则的配置项。
 */
export function describeConfig(config: Linter.Config, index: number): ConfigItem {
  const seen = new WeakSet<object>()
  const serialize = (value: unknown): unknown => {
    if (typeof value === 'function')
      return `[函数: ${value.name || '匿名'}]`
    if (typeof value === 'bigint')
      return String(value)
    if (!value || typeof value !== 'object')
      return value
    if (seen.has(value))
      return '[共享或循环引用]'
    seen.add(value)
    if (Array.isArray(value))
      return value.map(serialize)
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      serialize(item),
    ]))
  }
  const language = config.languageOptions
  const parser = language?.parser as { meta?: { name?: string, version?: string } } | undefined
  return {
    name: config.name ?? `未命名配置 #${index + 1}`,
    index: index + 1,
    files: config.files ?? [],
    ignores: config.ignores ?? [],
    rules: config.rules ?? {},
    plugins: Object.keys(config.plugins ?? {}),
    languageOptions: language
      ? serialize({
        ...language,
        parser: parser
          ? { name: parser.meta?.name ?? '未命名解析器', version: parser.meta?.version }
          : undefined,
      }) as Record<string, unknown>
      : undefined,
    linterOptions: config.linterOptions
      ? serialize(config.linterOptions) as Record<string, unknown>
      : undefined,
    settings: config.settings
      ? serialize(config.settings) as Record<string, unknown>
      : undefined,
    processor: typeof config.processor === 'string'
      ? config.processor
      : config.processor
        ? config.processor.meta?.name ?? '配置提供的处理器'
        : undefined,
    language: config.language,
  }
}
