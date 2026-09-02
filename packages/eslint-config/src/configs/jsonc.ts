import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * JSONC 配置工厂。
 *
 * parser、基础规则和 package.json / tsconfig.json 排序均由 antfu 管理，
 * 本包不为特定 JSON 工具追加额外规则。
 */
export async function jsonc(): Promise<Linter.Config[]> {
  // 从 antfu 的公开工厂取得 parser、插件注册和基础 JSONC 规则，避免本包
  // 直接依赖 eslint-plugin-jsonc，也避免同一插件出现两套版本。
  const upstreamJsonc = await interopDefault(
    import('@antfu/eslint-config'),
    'jsonc',
  )

  return upstreamJsonc()
}
