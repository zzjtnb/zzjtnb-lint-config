/** 创建本包默认配置；复制自有规则和语言模型，复用上游 parser 模块实例。 */
import type { Config } from 'stylelint'

import { orderRules } from '../rules/order'
import { sharedRules } from '../rules/shared'
import { fileOverrides } from './files'
import { createIgnorePatterns } from './ignores'
import { basePresets } from './presets'
import { languageOptions } from './syntax'

const defaults = {
  // 上游预设负责注册插件；不在本包重复注册排序或 SCSS 插件。
  extends: basePresets,
  // 无样式文件的子项目可以运行同一检查入口；消费方可设为 false。
  allowEmptyInput: true,
  // 扩展工具类指令与 rpx 单位，规则差异另由 rules 维护。
  languageOptions,
  // 缺少禁用原因时提示 warning，是否阻断由 CLI 的 warning 策略决定。
  reportDescriptionlessDisables: [
    true,
    { severity: 'warning' },
  ],
  // 禁用注释引用不存在的规则时提示 warning。
  reportInvalidScopeDisables: [
    true,
    { severity: 'warning' },
  ],
  // 已无必要的禁用注释提示 warning。
  reportNeedlessDisables: [
    true,
    { severity: 'warning' },
  ],
  // 未指定规则范围的全局禁用提示 warning。
  reportUnscopedDisables: [
    true,
    { severity: 'warning' },
  ],
  // 这里只声明本包规则差异；语言专属差异由 fileOverrides 放入对应作用域。
  rules: {
    ...sharedRules,
    ...orderRules,
  },
} satisfies Config

/**
 * 每次创建独立的规则、语言模型和列表，消费方修改配置不影响其他调用。
 * parser 含函数，交给 fileOverrides 单独注册实例；忽略路径按本次 CWD 生成。
 */
export function createConfig(): Config {
  return {
    ...structuredClone(defaults),
    overrides: fileOverrides(),
    ignoreFiles: createIgnorePatterns(),
  }
}
