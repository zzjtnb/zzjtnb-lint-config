import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * pnpm 配置工厂。
 *
 * pnpm 的 package.json 规则需要 JSONC parser，pnpm-workspace.yaml 规则需要
 * YAML parser；两者都由 antfu 负责动态加载。本包只转发开关，不直接安装
 * eslint-plugin-pnpm 或 yaml-eslint-parser。
 */
export async function pnpm(
  options: {
    // 是否启用 pnpm-workspace.yaml 的 YAML parser、规则和排序。
    workspace?: boolean
  } = {},
): Promise<Linter.Config[]> {
  // workspace=false 时仍保留 package.json 的 catalog 校验，只关闭
  // pnpm-workspace.yaml 的 parser、规则和排序。
  const upstreamPnpm = await interopDefault(
    import('@antfu/eslint-config'),
    'pnpm',
  )

  return upstreamPnpm({
    json: true,
    sort: options.workspace ?? true,
    yaml: options.workspace ?? true,
  })
}
