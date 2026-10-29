/** 从本包依赖边界定位上游预设；插件注册与语法适配由对应预设负责。 */
import { fileURLToPath } from 'node:url'

/**
 * 从共享包自身解析基础配置，而不是让 Stylelint 从消费项目根目录解析裸包名。
 *
 * Stylelint 的 `extends` 官方类型仍然是文件定位字符串；共享配置如果直接写
 * `stylelint-config-standard`，pnpm 的严格依赖边界会要求每个消费项目重复安装这些
 * 实现包。`import.meta.resolve` 会沿当前共享包的依赖边界解析，转换成绝对路径后，
 * Stylelint 就能稳定加载共享包自己声明的依赖。
 * @param locator 已声明依赖的包名或导出子路径，不是消费方 CWD 下的文件名。
 * @returns 对应模块入口的本地绝对文件路径；无法解析时向调用方抛出错误。
 */
function resolveDependency(locator: string): string {
  return fileURLToPath(import.meta.resolve(locator))
}

/**
 * 全文件共享的 CSS 标准与属性排序预设。
 * recess-order 自带 `stylelint-order` 注册；插件由本包声明依赖以满足其 peer，不在入口再注册一份。
 * SCSS / Vue 的语法调整通过文件 override 追加，不能把它们提升到全部 CSS 文件。
 */
export const basePresets = [
  resolveDependency('stylelint-config-standard'),
  resolveDependency('stylelint-config-recess-order'),
]

/** SCSS 文件使用官方 recommended 规则。 */
export const scssPresets = [
  resolveDependency('stylelint-config-recommended-scss'),
]

/** Vue SFC 使用的官方 Vue + SCSS 容器规则。 */
export const vuePresets = [
  // `/scss` 变体同时处理 Vue 容器和其中可能出现的 SCSS style block。
  resolveDependency('stylelint-config-recommended-vue/scss'),
]
