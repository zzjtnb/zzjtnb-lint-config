import type { Config } from 'stylelint'

import stylelintOrder from 'stylelint-order'
import { stylelintDefaultIgnoreGlobs } from './constants.js'
import { stylelintExtends, stylelintVueExtends } from './extends.js'
import {
  createStylelintIgnoreFiles,
  stylelintIgnoreFiles,
} from './ignores.js'
import {
  stylelintLanguageOptions,
  stylelintScssAtRuleOptions,
} from './language.js'
import {
  stylelintExecutionOptions,
  stylelintReportOptions,
} from './options.js'
import { stylelintOverrides } from './overrides.js'
import { stylelintRules, stylelintScssRules } from './rules.js'

/**
 * Stylelint 官方共享配置入口。
 *
 * 发布包必须导出普通配置对象，而不是 ESLint 那种异步工厂；这样用户可以直接在
 * `stylelint.config.ts` 中写 `extends: ['@zzjtnb/stylelint-config']`。
 */
const stylelintConfig = {
  extends: stylelintExtends,
  // 直接导入插件对象，避免 Stylelint 从消费方根目录解析共享包的传递依赖。
  // recess preset 提供属性顺序；SCSS 插件由对应的 SCSS override 按作用域加载。
  plugins: stylelintOrder,
  ...stylelintExecutionOptions,
  languageOptions: stylelintLanguageOptions,
  ...stylelintReportOptions,
  rules: stylelintRules,
  ignoreFiles: stylelintIgnoreFiles,
  overrides: stylelintOverrides,
} satisfies Config

export {
  createStylelintIgnoreFiles,
  stylelintDefaultIgnoreGlobs,
  stylelintExecutionOptions,
  stylelintExtends,
  stylelintIgnoreFiles,
  stylelintLanguageOptions,
  stylelintOverrides,
  stylelintReportOptions,
  stylelintRules,
  stylelintScssAtRuleOptions,
  stylelintScssRules,
  stylelintVueExtends,
}

export default stylelintConfig
