import type { PlaygroundMode } from '../../../../types'
import type { FactoryOption } from '../types'
import { parse } from 'acorn'

const languages = [
  { key: 'typescript', label: 'TypeScript' },
  { key: 'vue', label: 'Vue' },
  { key: 'markdown', label: 'Markdown' },
]

function factory(source: string) {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const imported = ast.body.find(node => node.type === 'ImportDeclaration' && node.source.value === '@zzjtnb/eslint-config')
  if (imported?.type !== 'ImportDeclaration')
    return
  const binding = imported.specifiers.find(node => node.type === 'ImportSpecifier' && node.imported.type === 'Identifier' && node.imported.name === 'zzjtnb')?.local.name
  const exported = ast.body.find(node => node.type === 'ExportDefaultDeclaration')
  let expression = exported?.type === 'ExportDefaultDeclaration'
    ? exported.declaration
    : undefined
  if (expression?.type === 'AwaitExpression')
    expression = expression.argument
  if (expression?.type !== 'CallExpression' || expression.callee.type !== 'Identifier' || expression.callee.name !== binding)
    return
  const options = expression.arguments[0]
  if (options && options.type !== 'ObjectExpression')
    return
  return { call: expression, options }
}

/**
 * 读取能保真编辑的 ESLint 语言开关；不分析执行任意表达式。
 * @param source 完整配置源码。
 * @param mode 当前工具。
 * @returns 选项值和可编辑边界。
 */
export function factoryOptions(source: string, mode: PlaygroundMode): FactoryOption[] {
  if (mode !== 'eslint')
    return []
  try {
    const target = factory(source)
    return languages.map((item) => {
      if (!target)
        return { ...item, value: null, editable: false }
      const properties = target.options?.properties ?? []
      if (properties.some(property => property.type === 'SpreadElement' || property.computed))
        return { ...item, value: null, editable: false }
      const found = properties.filter(property => property.type === 'Property' && (property.key.type === 'Identifier'
        ? property.key.name
        : property.key.type === 'Literal'
          ? property.key.value
          : '') === item.key)
      const property = found.at(-1)
      if (!property)
        return { ...item, value: true, editable: true }
      return {
        ...item,
        value: property.type === 'Property' && property.value.type === 'Literal' && typeof property.value.value === 'boolean'
          ? property.value.value
          : null,
        editable: found.length === 1 && property.type === 'Property' && property.value.type === 'Literal' && typeof property.value.value === 'boolean',
      }
    })
  }
  catch { return languages.map(item => ({ ...item, value: null, editable: false })) }
}

/**
 * 定位正式工厂选项并局部更新，注释、其他选项与未知表达式不重写。
 * @param source 配置模块原文。
 * @param key 受支持的语言集成键。
 * @param enabled 新开关值。
 * @returns 完整模块源码；超出编辑范围时失败。
 */
export function setFactoryOption(source: string, key: string, enabled: boolean): string {
  const option = factoryOptions(source, 'eslint').find(item => item.key === key)
  if (!option?.editable)
    throw new Error('当前配置包含动态或未知表达式，请在配置源码中编辑此选项')
  const target = factory(source)!
  const property = target.options?.properties.find(property => property.type === 'Property' && (property.key.type === 'Identifier'
    ? property.key.name
    : property.key.type === 'Literal'
      ? property.key.value
      : '') === key)
  if (property?.type === 'Property')
    return source.slice(0, property.value.start) + String(enabled) + source.slice(property.value.end)
  if (!target.options)
    return `${source.slice(0, target.call.end - 1)}{ ${key}: ${enabled} }${source.slice(target.call.end - 1)}`
  const insert = `${key}: ${enabled}, `
  return source.slice(0, target.options.start + 1) + insert + source.slice(target.options.start + 1)
}
