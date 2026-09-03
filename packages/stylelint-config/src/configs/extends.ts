import { fileURLToPath } from 'node:url'

/**
 * 从共享包自身解析基础配置，而不是让 Stylelint 从消费项目根目录解析裸包名。
 *
 * Stylelint 的 `extends` 官方类型仍然是文件定位字符串；共享配置如果直接写
 * `stylelint-config-standard`，pnpm 的严格依赖边界会要求每个消费项目重复安装这些
 * 实现包。`import.meta.resolve` 会沿当前共享包的依赖边界解析，转换成绝对路径后，
 * Stylelint 就能稳定加载共享包自己声明的依赖。
 */
export function resolveConfig(locator: string): string {
  return fileURLToPath(import.meta.resolve(locator))
}

/** 官方 CSS 基础规则和 recess 属性顺序规则。 */
export const baseExtends = [
  resolveConfig('stylelint-config-standard'),
  resolveConfig('stylelint-config-recess-order'),
]

/** SCSS 文件使用官方 recommended 规则。 */
export const scssExtends = [
  resolveConfig('stylelint-config-recommended-scss'),
]

/** Vue SFC 使用的官方 Vue + SCSS 容器规则。 */
export const vueExtends = [
  // `/scss` 变体同时处理 Vue 容器和其中可能出现的 SCSS style block。
  resolveConfig('stylelint-config-recommended-vue/scss'),
]
