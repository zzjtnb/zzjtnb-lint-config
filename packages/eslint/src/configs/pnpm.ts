/** 只修改 antfu 已生成的 pnpm 配置，不重复判断工作区、启用条件或文件范围。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/**
 * 保留上游设置检查，只停止强制 trustPolicy，并按完整版本声明判断 catalog 重复。
 * @param configs antfu 生成的配置序列，未开启 pnpm 时原样返回对应内容。
 * @returns 保留顺序与其他规则的配置序列；上游设置规则结构变化时明确失败。
 */
export function pnpm(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (config.name !== 'antfu/pnpm/pnpm-workspace-yaml')
      return config
    const rule = config.rules?.['pnpm/yaml-enforce-settings']
    if (!Array.isArray(rule) || !rule[1]?.settings)
      throw new Error('antfu 的 pnpm settings 配置契约已变化，请核对上游配置')
    const settings = { ...rule[1].settings }
    // 不替消费方添加或修改 trustPolicy；其他上游字段及 autofix 行为保持原样。
    delete settings.trustPolicy
    return {
      ...config,
      rules: {
        ...config.rules,
        'pnpm/yaml-enforce-settings': [
          rule[0],
          { ...rule[1], settings },
        ],
        // 仅禁止同名包、同版本声明的重复，不把不同版本强制归并。
        'pnpm/yaml-no-duplicate-catalog-item': [
          'error',
          { checkDuplicates: 'exact-version' },
        ],
      },
    }
  })
}
