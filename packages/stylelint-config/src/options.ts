/**
 * Stylelint disable 注释的维护性提示。
 *
 * 这些检查只设置为 warning：它们用于提醒清理长期豁免，不应因为共享配置中的
 * 注释质量问题阻塞所有消费方项目的样式构建。
 */
const disableReportSettings: [true, { severity: 'warning' }] = [
  true,
  { severity: 'warning' },
]

/**
 * 对 `stylelint-disable` 注释启用的四类维护检查。
 *
 * - descriptionless：禁用注释缺少原因说明；
 * - invalid-scope：注释引用了不存在的规则范围；
 * - needless：禁用已经不再需要的规则；
 * - unscoped：避免使用没有限定具体规则的全局禁用。
 */
export const stylelintReportOptions = {
  reportDescriptionlessDisables: disableReportSettings,
  reportInvalidScopeDisables: disableReportSettings,
  reportNeedlessDisables: disableReportSettings,
  reportUnscopedDisables: disableReportSettings,
}

/**
 * 共享配置只开启不会写回文件的执行容错。
 *
 * - `allowEmptyInput`：monorepo 子包没有样式文件时不报错；
 * - `cache`：缓存目录由消费方脚本显式决定；
 * - `fix`：写回文件由消费方的 `--fix` 或本地配置显式决定。
 */
export const stylelintExecutionOptions = {
  allowEmptyInput: true,
  cache: false,
  fix: false,
}
