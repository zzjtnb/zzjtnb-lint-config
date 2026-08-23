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

  // antfu 已包含 Node 规则、插件注册和测试文件中的必要覆盖；本包不再
  // 通过 allowModules 白名单掩盖 package.json 中真实存在的依赖声明问题。
  return [
    ...(await upstreamNode()),
    {
      // 构建脚本和仓库维护脚本本来就在 Node 运行时中使用全局 process。
      // 这些目录不是发布给第三方消费的库代码，不要求为了规则形式改写
      // 成 import process from 'node:process'。
      files: [
        'scripts/**/*.?([cm])[jt]s?(x)',
        'internal/**/*.?([cm])[jt]s?(x)',
      ],
      rules: {
        // 允许仓库脚本使用 Node 提供的全局 process。
        'node/prefer-global/process': 'off',
      },
    },
  ]
}
