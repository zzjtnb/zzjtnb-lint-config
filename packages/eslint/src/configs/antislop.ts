/** antislop 的共享差异：允许注释示例，文本检查仅作用于具有源码 parser 的文件。 */
import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import { GLOB_SRC, GLOB_VUE } from '@antfu/eslint-config'

/** 保留注释中的可选代码示例；其他 antislop 规则由上游维护。 */
export const antislopRules = { 'sonarjs/no-commented-code': 'off' } satisfies NonNullable<TypedFlatConfigItem['rules']>

/**
 * 将通用文本规则限定到已有源码 parser 的文件，保留其他配置和原有顺序。
 * 上游此片段没有独立 parser；直接匹配 CSS、Markdown 会将其当作 JavaScript 解析。
 */
export function scopeAntislop(configs: TypedFlatConfigItem[]): TypedFlatConfigItem[] {
  return configs.map((config) => {
    if (config.name !== 'antfu/antislop/rules/universal')
      return config

    return {
      ...config,
      files: [GLOB_SRC, GLOB_VUE],
    }
  })
}
