import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * perfectionist 配置工厂。
 *
 * antfu 已经集成 eslint-plugin-perfectionist；这里保留独立工厂，方便
 * 组合器按配置文件拆分加载，同时避免本包重复声明插件和推荐规则。
 */
export async function perfectionist(): Promise<Linter.Config[]> {
  // 空选项使用 antfu 的默认排序策略；不在这里覆盖任何 sort-* 规则。
  const upstreamPerfectionist = await interopDefault(
    import('@antfu/eslint-config'),
    'perfectionist',
  )

  return upstreamPerfectionist({})
}
