import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * TypeScript 配置工厂。
 *
 * TypeScript parser、基础规则、Vue SFC 中的 TS 处理以及类型感知相关的
 * 上游配置全部交给 antfu，本包不复制 @typescript-eslint 的规则集合。
 */
export async function typescript(options: { vue?: boolean } = {}): Promise<Linter.Config[]> {
  // 通过 antfu 的公开工厂加载 parser 和规则，保持上游升级时的配置同步。
  const upstreamTypescript = await interopDefault(
    import('@antfu/eslint-config'),
    'typescript',
  )

  return upstreamTypescript({
    // Vue SFC 中的 <script lang="ts"> 需要交给 TypeScript parser；普通 TS
    // 项目不传入 .vue，避免 Vue parser 处理无关文件。
    componentExts: options.vue ? ['vue'] : [],
  })
}
