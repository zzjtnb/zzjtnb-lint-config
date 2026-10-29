import type { PlaygroundMode } from '../../../../types'
import { parse } from 'acorn'

/**
 * 基于 ESM 语法定位默认导出，保留注释、动态表达式和其他源码。
 * @param source 用户配置模块。
 * @param overrides 最后追加的规则覆盖。
 * @param mode 工具的正式配置语义。
 * @returns 可直接保存的完整 ESM 配置；语法错误或缺少默认导出时失败。
 */
export function exportConfig(source: string, overrides: Record<string, unknown>, mode: PlaygroundMode): string {
  const ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
  const declaration = ast.body.find(node => node.type === 'ExportDefaultDeclaration')
  if (!declaration)
    throw new Error('配置缺少 export default，不能生成完整导出')
  if (!Object.keys(overrides).length && mode !== 'markdownlint')
    return source
  let name = 'playgroundBase'
  while (new RegExp(`\\b${name}\\b`).test(source)) name += '_'
  const expression = source.slice(declaration.declaration.start, declaration.declaration.end)
  const base = `${source.slice(0, declaration.start)}const ${name} = await (${expression});${source.slice(declaration.end)}`
  const rules = JSON.stringify(overrides, null, 2)
  const resolved = name
  const output = mode === 'eslint'
    ? `[...(Array.isArray(${resolved}) ? (${resolved}) : [${resolved}]), { name: 'project/overrides', rules: ${rules} }]`
    : mode === 'stylelint'
      ? `{ ...(${resolved}), overrides: [...((${resolved}).overrides ?? []), { files: ['**/*'], rules: ${rules} }] }`
      : `{
  // 扫描默认值由共享入口维护，规则覆盖集中放在 config 内。
  ...(await import('@zzjtnb/markdownlint-config/config')).default,
  config: { ...(${resolved}), ...${rules} },
}`
  return `${base}\n\nexport default ${output}\n`
}
