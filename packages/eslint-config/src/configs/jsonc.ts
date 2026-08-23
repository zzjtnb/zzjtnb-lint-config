import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * JSONC 配置工厂。
 *
 * antfu 已经提供 JSON / JSONC parser、基础错误检查和 package.json、
 * tsconfig.json 排序；当前组织只额外要求 cspell 词表和忽略路径保持稳定
 * 的字母顺序，因此不重复实现上游已有的 package/tsconfig 排序规则。
 */
export async function jsonc(): Promise<Linter.Config[]> {
  // 从 antfu 的公开工厂取得 parser、插件注册和基础 JSONC 规则，避免本包
  // 直接依赖 eslint-plugin-jsonc，也避免同一插件出现两套版本。
  const upstreamJsonc = await interopDefault(
    import('@antfu/eslint-config'),
    'jsonc',
  )

  return [
    ...(await upstreamJsonc()),
    {
      // 只匹配 cspell 配置，避免把本规则扩散到其它 JSONC 文件。
      files: ['**/cspell.json', '**/.cspell.json'],
      rules: {
        // cspell 的单词表和忽略路径按升序排列，减少无意义的 diff。
        'jsonc/sort-array-values': [
          'error',
          {
            // 按自然字母顺序比较数组字符串。
            order: { type: 'asc' },
            // 只处理 words 和 ignorePaths，避免改变 cspell 其它数组语义。
            pathPattern: '^words$|^ignorePaths$',
          },
        ],
      },
    },
  ]
}
