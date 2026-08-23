import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * YAML 配置工厂。
 *
 * YAML parser、eslint-plugin-yml 注册和基础 YAML 规则统一复用 antfu；
 * 当前组织没有另一套 YAML 规则，因此这里不再直接声明插件依赖。
 */
export async function yaml(): Promise<Linter.Config[]> {
  // 保持 YAML 文件和 Vue 自定义块使用上游同一套 parser/规则实例。
  const upstreamYaml = await interopDefault(
    import('@antfu/eslint-config'),
    'yaml',
  )

  // 返回上游配置，不添加第二套 YAML 规则或排序策略。
  return upstreamYaml()
}
