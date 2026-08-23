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
    // 是否显式要求 pnpm 自动维护 shellEmulator 和 trustPolicy。
    enforceSettings?: boolean
  } = {},
): Promise<Linter.Config[]> {
  // workspace=false 时仍保留 package.json 的 catalog 校验，只关闭
  // pnpm-workspace.yaml 的 parser、规则和排序。
  const upstreamPnpm = await interopDefault(
    import('@antfu/eslint-config'),
    'pnpm',
  )

  return [
    ...(await upstreamPnpm({
      // 开启 package.json 中 pnpm catalog / workspace 协议的检查。
      json: true,
      // 组织默认要求 pnpm-workspace.yaml 的顶层设置保持稳定顺序。
      sort: options.workspace ?? true,
      // 开启 pnpm-workspace.yaml 的 YAML parser 和 pnpm 规则。
      yaml: options.workspace ?? true,
    })),
    {
      // 普通版本号由 json-enforce-catalog 自动改回 catalog:；当版本比现有
      // catalog 新时直接更新默认 catalog，避免生成需要人工清理的 conflicts_*。
      files: ['package.json', '**/package.json'],
      rules: {
        'pnpm/json-enforce-catalog': [
          'error',
          {
            conflicts: 'overrides',
          },
        ],
      },
    },
    ...(options.workspace === false || options.enforceSettings === true
      ? []
      : [{
          // 只关闭会自动补写 pnpm 设置的规则；catalog 校验和 YAML 排序仍保留。
          files: ['pnpm-workspace.yaml', '**/pnpm-workspace.yaml'],
          rules: {
            // 不自动写入 shellEmulator: true 和 trustPolicy: no-downgrade。
            'pnpm/yaml-enforce-settings': 'off' as const,
          },
        }]),
  ]
}
