import type { Config } from 'stylelint'

/**
 * 将 Stylelint 配置中的指定字段收窄为必填字段。
 *
 * Stylelint 官方 `Config` 类型会把大多数字段设计为可选，因为不同项目可以只配置其中一部分。
 * 但本包的默认导出始终提供这些字段，所以这里收窄类型，方便消费方获得更准确的编辑器补全，
 * 也避免在集成测试或本地配置中出现不必要的 “possibly undefined” 判断。
 */
type ConfigWithRequired<K extends keyof Config> = Config & Required<Pick<Config, K>>

/**
 * `stylelint-config-zzjtnb` 默认导出的具体配置形状。
 *
 * 它基于 Stylelint 官方 `Config` 类型，并明确标记本包一定提供的字段：
 * 基础预设、内置执行选项、语言语法扩展、规则、忽略列表和文件覆盖配置。
 */
export type StylelintConfig = ConfigWithRequired<
  | 'allowEmptyInput'
  | 'cache'
  | 'extends'
  | 'fix'
  | 'ignoreFiles'
  | 'languageOptions'
  | 'overrides'
  | 'rules'
>

/**
 * 本包提供的 Stylelint 语言语法扩展配置。
 *
 * 用来表达 Stylelint 17 能原生建模的目标技术栈语法：
 * - 通过 `syntax.atRules` 注册 UnoCSS / Tailwind 风格指令
 * - 通过 `syntax.units.length` 注册 uni-app 的 `rpx` 长度单位
 */
export type StylelintLanguageOptions = NonNullable<Config['languageOptions']> & {
  syntax: NonNullable<NonNullable<Config['languageOptions']>['syntax']> & {
    /** 注册为 Stylelint 一等语法的 UnoCSS / Tailwind 风格 at-rules。 */
    atRules: NonNullable<NonNullable<NonNullable<Config['languageOptions']>['syntax']>['atRules']>
    /** 本包扩展的单位分类，其中 `length` 包含 uni-app 的 `rpx`。 */
    units: NonNullable<NonNullable<NonNullable<Config['languageOptions']>['syntax']>['units']> & {
      length: string[]
    }
  }
}

/**
 * 默认导出继承的基础共享配置列表。
 *
 * 保留命名导出是为了让高级用户可以检查或组合相同的 preset 顺序，
 * 不需要从源码里复制内部实现细节。
 */
export declare const stylelintExtends: string[]

/**
 * 内置执行选项。
 *
 * 本包显式声明这些执行选项，避免消费方误解默认行为：
 * - `allowEmptyInput: true`：避免 monorepo 空 glob 场景报错
 * - `cache: false`：缓存由消费方脚本或本地配置显式开启
 * - `fix: false`：自动修复由消费方脚本或本地配置显式开启
 */
export declare const stylelintExecutionOptions: Required<Pick<
  Config,
  'allowEmptyInput' | 'cache' | 'fix'
>>

/**
 * Stylelint 17 的语言语法扩展配置。
 *
 * 当语法可以用当前 Stylelint 语言模型表达时，优先放在这里；
 * 只有 SCSS 插件规则尚未读取该语言模型时，才在对应规则里复用同一份 at-rule 列表。
 */
export declare const stylelintLanguageOptions: StylelintLanguageOptions

/**
 * SCSS 专用 unknown at-rule 规则复用的 utility-first at-rule 配置。
 *
 * `scss/at-rule-no-unknown` 当前不读取 `languageOptions.syntax.atRules`，
 * 所以这里显式导出同一份规则层配置，避免 SCSS 与 CSS 语法支持不一致。
 */
export declare const stylelintScssAtRuleOptions: {
  ignoreAtRules: string[]
}

/**
 * `stylelint-disable` 注释维护检查。
 *
 * 默认配置会以 warning 级别报告：缺少说明、作用域无效、已经不必要、未限定具体规则的
 * `stylelint-disable` 注释。这样可以提醒团队清理长期豁免，又不会默认让所有项目硬失败。
 */
export declare const stylelintReportOptions: Required<Pick<
  Config,
  | 'reportDescriptionlessDisables'
  | 'reportInvalidScopeDisables'
  | 'reportNeedlessDisables'
  | 'reportUnscopedDisables'
>>

/**
 * 针对目标技术栈的规则行为取舍。
 *
 * 消费方在继承本包后，仍然可以在本地 `rules` 中覆盖任意规则。
 */
export declare const stylelintRules: NonNullable<Config['rules']>

/**
 * 从消费方项目当前工作目录解析的共享忽略 glob。
 *
 * 当项目需要追加自己的忽略路径时，可以导入该数组并展开，
 * 这样既保留本包默认忽略项，也能让本地新增项清晰可见。
 */
export declare const stylelintIgnoreFiles: string[]

/**
 * 按文件类型应用的解析器覆盖配置。
 *
 * Vue SFC 使用 `postcss-html`，SCSS 文件使用 `postcss-scss`。
 * 放在 `overrides` 中可以让一次 Stylelint 运行同时覆盖 CSS、SCSS 和 Vue 文件。
 */
export declare const stylelintOverrides: NonNullable<Config['overrides']>

/**
 * 默认 Stylelint 共享配置对象。
 *
 * 普通消费方通常只需要：
 *
 * ```js
 * export default {
 *   extends: ['stylelint-config-zzjtnb'],
 * }
 * ```
 */
declare const stylelintConfig: StylelintConfig

export default stylelintConfig
