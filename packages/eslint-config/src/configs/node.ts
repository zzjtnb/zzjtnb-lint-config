import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * Node.js 配置工厂。
 *
 * antfu 负责 eslint-plugin-n 的加载、插件注册和基础推荐规则；本包不再
 * 复制 Node 规则，也不直接安装 eslint-plugin-n。
 */
export async function node(): Promise<Linter.Config[]> {
  // 动态复用上游配置，保证插件实例和规则版本与 antfu 一致。
  const upstreamNode = await interopDefault(
    import('@antfu/eslint-config'),
    'node',
  )

  return upstreamNode()
}
