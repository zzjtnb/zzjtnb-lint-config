/** 公开 Stylelint 工厂：按调用顺序合并项目覆盖，默认导出供原生 extends 使用。 */
import type { Config } from 'stylelint'
import { createConfig } from './configs/defaults'

/** 将原生配置允许的单值和数组统一为列表，不复制第三方插件或 parser。 */
function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined)
    return []
  if (Array.isArray(value))
    return value
  return [value]
}

/**
 * 创建独立的共享配置，依次应用消费方参数。
 * 列表按调用顺序追加，规则按名称覆盖，不递归混合单条规则的参数；parser 保留模块实例。
 * @param config 项目配置；列表追加，同名规则后置覆盖，其余字段替换。
 * @param configs 后续配置片段，其规则优先于前面的全局规则和文件规则。
 * @returns 可直接导出的 Stylelint 原生配置对象；不修改传入的配置或 parser。
 */
export function zzjtnb(config: Config = {}, ...configs: Config[]): Config {
  let result = createConfig()
  for (const next of [config, ...configs]) {
    result = {
      ...result,
      ...next,
      // 保留共享预设与插件，项目只追加自己需要的条目。
      extends: [
        ...toArray(result.extends),
        ...toArray(next.extends),
      ],
      plugins: [
        ...toArray(result.plugins),
        ...toArray(next.plugins),
      ],
      // 通用忽略和项目路径使用同一套追加语义。
      ignoreFiles: [
        ...toArray(result.ignoreFiles),
        ...toArray(next.ignoreFiles),
      ],
      // 例如消费方全局关闭一条规则，旧文件 override 里的共享默认也必须同步关闭。
      rules: {
        ...result.rules,
        ...next.rules,
      },
      // 新的文件级覆盖排在旧配置之后：消费方局部例外仍高于它自己的全局规则。
      overrides: [
        ...(result.overrides ?? []).map(override => ({
          ...override,
          rules: {
            ...override.rules,
            ...next.rules,
          },
        })),
        // 当前参数的文件级例外最后追加，仍高于它自身的全局规则。
        ...(next.overrides ?? []),
      ],
    }
  }
  return result
}
