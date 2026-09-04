import type { Config } from 'stylelint'

/**
 * 块内节点顺序；CSS 属性间的排序继续由 recess-order 预设维护，不复制属性表。
 *
 * `stylelint-order` 由 recess-order 预设注册，此处只维护本包额外约定的 `order/order`。
 * 通用 at-rule 放在声明之前，带内容的 supports / media / include 则放在声明之后、嵌套规则之前。
 * 这些描述项由插件按类型和名称匹配，不应当按数组的文本顺序理解为“所有 at-rule 永远在前”。
 * 来源：https://github.com/hudochenkov/stylelint-order/blob/master/rules/order/README.md
 */
export const orderRules: NonNullable<Config['rules']> = {
  // 统一 at-rule / 声明 / 嵌套层级顺序；属性顺序由 recess preset 提供。
  'order/order': [
    [
      'dollar-variables',
      'custom-properties',
      'at-rules',
      'declarations',
      { name: 'supports', type: 'at-rule' },
      { name: 'media', type: 'at-rule' },
      { name: 'include', type: 'at-rule' },
      'rules',
    ],
    { severity: 'error' },
  ],

}
