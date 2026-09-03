import type { OptionsConfig } from '@antfu/eslint-config'

/**
 * 各类项目都通用的生成物和非源码资源；项目特有路径仍通过 `ignores` 显式追加。
 *
 * antfu 自身的默认忽略项仍会保留。这里仅补充生成物、快照和字体等不需要 ESLint
 * 解析的通用文件，不把脚本、测试夹具或仓库工具配置排除在检查之外。
 */
const defaultIgnores = [
  '**/dist-*',
  '**/*-dist',
  '**/.nitro',
  '**/*.snap',
  '**/*.ttf',
  '**/*.woff',
] as const

/**
 * 默认忽略项配置工厂。
 *
 * 始终先保留 antfu 的原始忽略项，再追加本包通用生成物和消费方路径。传入
 * `defaultIgnores: false` 时，消费方显式接管完整忽略列表。
 */
export function ignores(
  consumerIgnores: OptionsConfig['ignores'] = [],
  defaultIgnoreList: readonly string[] | false = defaultIgnores,
): OptionsConfig['ignores'] {
  if (defaultIgnoreList === false) {
    if (typeof consumerIgnores === 'function') {
      return originals => consumerIgnores(originals)
    }

    return () => consumerIgnores
  }

  return (originals) => {
    const mergedIgnores = [...originals, ...defaultIgnoreList]
    if (typeof consumerIgnores === 'function') {
      return consumerIgnores(mergedIgnores)
    }

    return [...mergedIgnores, ...consumerIgnores]
  }
}
