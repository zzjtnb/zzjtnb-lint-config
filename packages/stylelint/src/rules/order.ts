/** 属性组织规则差异；具体属性排序列表与排序插件由上游 recess-order 维护。 */
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
      {
        // 按名称匹配 @supports 节点，放在普通声明之后。
        name: 'supports',
        // 指定排序项为 at-rule，按其名称匹配对应语法节点。
        type: 'at-rule',
      },
      {
        // 按名称匹配 @media 节点，保留响应式块与普通声明的组织层次。
        name: 'media',
        // 指定排序项为 at-rule，按其名称匹配对应语法节点。
        type: 'at-rule',
      },
      {
        // 按名称匹配 Sass @include，不改变前面通用 at-rule 的排序。
        name: 'include',
        // 指定排序项为 at-rule，按其名称匹配对应语法节点。
        type: 'at-rule',
      },
      'rules',
    ],
    {
      // 使用此诊断级别；warning 只提示，error 影响检查失败状态。
      severity: 'error',
    },
  ],

}
