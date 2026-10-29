/** 徽标可以出现的三种状态；联合类型会让写错状态名的代码在类型检查阶段就报错。 */
export type Status = 'success' | 'warning' | 'error'

/** 每种状态显示给用户看的文字。 */
export const statusLabels: Record<Status, string> = {
  success: '成功',
  warning: '警告',
  error: '失败',
}

/**
 * 每种状态对应的图标类名。
 * 类名写在 TS 文件里也能生效：uno.config.ts 的 content.pipeline 把 src 下的 .ts 也纳入了扫描。
 * `i-svg:文件名` 指向 src/assets/icons 下的同名 SVG；如果在这里新增状态，记得放入对应图标。
 */
export const statusIcons: Record<Status, string> = {
  success: 'i-svg:check',
  warning: 'i-svg:warning',
  error: 'i-svg:warning',
}
