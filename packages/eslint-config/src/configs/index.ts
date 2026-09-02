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
 * 组合本包对外导出的独立语言配置。
 *
 * 每个开关只控制本包对应的动态工厂；上游已经负责的配置仍由上游维护，
 * 这里不通过 composer.remove 或重复规则覆盖它们。
 */
export async function organizationOverrides(options: {
  /** 是否启用 JSONC 配置。 */
  jsonc?: boolean
  /** 是否启用上游 Node 工厂。 */
  node?: boolean
  /** 是否启用 pnpm package.json 和 catalog 规则。 */
  pnpm?: boolean
  /** 是否启用 pnpm-workspace.yaml parser 和排序规则。 */
  pnpmWorkspace?: boolean
  /** 是否启用 TypeScript 工厂；vue=true 时同时解析 Vue 中的 TS。 */
  typescript?: boolean
  /** 是否启用 Vue 配置。 */
  vue?: boolean
  /** 是否启用上游 YAML 工厂。 */
  yaml?: boolean
} = {}): Promise<Linter.Config[]> {
  const configs = await Promise.all([
    // JSONC parser、推荐规则和标准 JSON 排序完全复用 antfu。
    options.jsonc === false ? [] : jsonc(),
    // Node 工厂由 antfu 注册 eslint-plugin-n，本包不重复声明插件。
    options.node === false ? [] : node(),
    // workspace 开关只控制 pnpm-workspace.yaml，不影响 package.json 检查。
    options.pnpm === false ? [] : pnpm({ workspace: options.pnpmWorkspace }),
    // 启用 Vue 时，TypeScript parser 同时处理 SFC 中的 TypeScript。
    options.typescript === false ? [] : typescript({ vue: options.vue }),
    // Vue 工厂复用上游推荐配置，再追加本包公开的 Vue 约定。
    options.vue === false ? [] : vue({ typescript: options.typescript }),
    // YAML parser、插件和推荐规则完全交给 antfu。
    options.yaml === false ? [] : yaml(),
  ])
  return configs.flat()
}
