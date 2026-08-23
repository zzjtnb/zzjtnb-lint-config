import type { Linter } from 'eslint'

import { jsonc } from './jsonc.js'
import { node } from './node.js'
import { pnpm } from './pnpm.js'
import { typescript } from './typescript.js'
import { vue } from './vue.js'
import { yaml } from './yaml.js'

export * from './ignores.js'
export * from './javascript.js'
export * from './jsonc.js'
export * from './node.js'
export * from './perfectionist.js'
export * from './pnpm.js'
export * from './typescript.js'
export * from './vue.js'
export * from './yaml.js'

/**
 * 组合不含具体仓库路径和内部别名的组织级规则。
 *
 * 每个开关只控制本包对应的动态工厂；上游已经负责的配置仍由上游维护，
 * 这里不通过 composer.remove 或重复规则覆盖它们。
 */
export async function organizationOverrides(options: {
  /** 是否启用组织级 JSONC 补充规则。 */
  jsonc?: boolean
  /** 是否启用上游 Node 工厂。 */
  node?: boolean
  /** 是否启用 pnpm package.json 和 catalog 规则。 */
  pnpm?: boolean
  /** 是否启用 pnpm-workspace.yaml parser 和排序规则。 */
  pnpmWorkspace?: boolean
  /** 是否启用 TypeScript 工厂；vue=true 时同时解析 Vue 中的 TS。 */
  typescript?: boolean
  /** 是否启用组织级 Vue 模板规则。 */
  vue?: boolean
  /** 是否启用上游 YAML 工厂。 */
  yaml?: boolean
} = {}): Promise<Linter.Config[]> {
  const configs = await Promise.all([
    // cspell.json 只追加上游没有覆盖的数组排序规则。
    options.jsonc === false ? [] : jsonc(),
    // Node 工厂完全复用 antfu，不重复声明 eslint-plugin-n。
    options.node === false ? [] : node(),
    // pnpm 工厂负责 package.json；workspace 开关单独控制 YAML 文件。
    options.pnpm === false ? [] : pnpm({ workspace: options.pnpmWorkspace }),
    // Vue 项目需要把 .vue 文件交给 TypeScript parser 解析。
    options.typescript === false ? [] : typescript({ vue: options.vue }),
    // Vue 工厂只追加组织级模板规则，并把 TS parser 开关传给上游 Vue 工厂。
    options.vue === false ? [] : vue({ typescript: options.typescript }),
    // YAML parser 和基础规则完全由 antfu 提供。
    options.yaml === false ? [] : yaml(),
  ])
  return configs.flat()
}
