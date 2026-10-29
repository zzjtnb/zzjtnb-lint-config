/** 通过各集成正式的 overrides 入口合并规则，不接管上游的启用与文件匹配逻辑。 */
import type { OptionsOverrides, TypedFlatConfigItem } from '@antfu/eslint-config'

/**
 * 通过上游集成的正式入口叠加规则，消费方同名规则优先，不深度拼接规则参数。
 * false 原样关闭；true / undefined 表示使用共享默认；对象同时保留上游支持的其他选项。
 */
export function withOverrides(
  options: boolean | OptionsOverrides | undefined,
  defaults: TypedFlatConfigItem['rules'],
): false | OptionsOverrides {
  if (options === false)
    return false
  let config: OptionsOverrides = {}
  if (typeof options === 'object')
    config = options
  return {
    ...config,
    overrides: {
      ...defaults,
      ...config.overrides,
    },
  }
}
