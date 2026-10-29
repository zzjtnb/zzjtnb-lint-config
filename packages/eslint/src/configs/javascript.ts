/** JavaScript 核心规则的默认差异，作用范围与启用条件由 antfu 维护。 */
import type { OptionsOverrides, TypedFlatConfigItem } from '@antfu/eslint-config'

export const javascript = {
  // 允许 ESM 顶层 await；异步初始化是否合理由实际加载行为决定。
  'antfu/no-top-level-await': 'off',
  // console 使用按上游选项检查，违规报告警告。
  'no-console': 'warn',
  // 未定义变量报告警告；TypeScript 等语言的上游豁免仍保留。
  'no-undef': 'warn',
  // 仅调整诊断级别，ESLint 保留上游规则已有的选择器参数。
  'no-restricted-syntax': 'warn',
} satisfies NonNullable<TypedFlatConfigItem['rules']>

/**
 * 在上游已生成规则后只改级别，保留 allow、语法选择器等已有参数。
 * 消费方明确提供的 javascript.overrides 不再叠加本包默认值；后续配置顺序不变。
 */
export function overrideJavaScript(config: TypedFlatConfigItem, overrides: OptionsOverrides['overrides'] = {}): TypedFlatConfigItem {
  const rules: NonNullable<TypedFlatConfigItem['rules']> = { ...config.rules }
  for (const [name, severity] of Object.entries(javascript)) {
    if (Object.hasOwn(overrides, name))
      continue
    const inherited = rules[name]
    if (!Array.isArray(inherited)) {
      rules[name] = severity
      continue
    }
    // ESLint 数组的第一项是级别，后面是规则参数；不能用单独的 warn 抹掉这些参数。
    rules[name] = [
      severity,
      ...inherited.slice(1),
    ]
  }
  return { ...config, rules }
}
