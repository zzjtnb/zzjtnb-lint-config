import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { Linter } from 'eslint'

/** 默认不启用外部 formatter；CSS / SCSS 由 Stylelint 负责。 */
export const defaultFormatters = false as const

/** Markdown 交给 markdownlint-cli2，避免 ESLint 和 Markdownlint 重复检查。 */
export const defaultMarkdown = false as const

/**
 * 默认启用 antfu 的 stylistic 规则，并完全使用上游默认风格。
 *
 * 这里不再复制 `indent`、`quotes` 等上游默认值；上游负责维护格式规则，
 * 本包只在消费方明确传入对象时转发其 stylistic 选项。
 */
export const defaultStylistic = true as const

/**
 * ESLint Flat Config 支持的 linter 级选项。
 *
 * 这里只报告未使用的禁用注释，不把 `--fix`、缓存等 CLI 执行参数混进
 * 共享配置，避免配置包改变消费方的执行策略。
 */
export const defaultLinterOptions = {
  // 禁止未使用的 eslint-disable 注释长期留在代码中，但只报告 warning。
  reportUnusedDisableDirectives: 'warn',
  // 禁止未使用的 eslint 命令式配置注释长期留在代码中，但只报告 warning。
  reportUnusedInlineConfigs: 'warn',
} as const

/**
 * 不依赖额外插件的通用规则调整。
 *
 * antfu 已经提供 JavaScript、TypeScript、perfectionist 等基础规则，这里
 * 只覆盖本组织和上游默认值不同的部分，避免复制整套上游实现。
 */
export const rules = {
  // 要求同一条链式调用保持一致的换行风格；组织默认关闭。
  'antfu/consistent-chaining': 'off',
  // 要求列表换行保持一致；组织默认关闭。
  'antfu/consistent-list-newline': 'off',
  // 要求控制流语句使用大括号；组织默认关闭。
  'antfu/curly': 'off',
  // 要求 if 条件换行符合 antfu 的个人风格；组织默认关闭。
  'antfu/if-newline': 'off',
  // 禁止从当前包的 dist 目录导入；组织默认关闭以兼容构建产物调试。
  'antfu/no-import-dist': 'off',
  // 禁止顶层 await；组织默认允许 ESM 配置和脚本使用它。
  'antfu/no-top-level-await': 'off',
  // 要求顶层函数声明风格一致；组织默认关闭。
  'antfu/top-level-function': 'off',
  // CLI、脚本和构建配置需要正常输出日志，因此默认不禁止 console。
  'no-console': 'off',
  // 生命周期回调和适配器可能需要保留空函数，因此不把它们判为错误。
  'no-empty-function': 'off',
  // TypeScript parser / 类型规则负责 TS 文件的变量检查，避免核心规则重复报错。
  'no-undef': 'off',
  // 禁止容易掩盖控制流问题的语法，以及当前项目不使用的 TS 特殊语法。
  'no-restricted-syntax': [
    'error',
    // 调试语句不应进入提交代码。
    'DebuggerStatement',
    // 标签语句容易隐藏复杂控制流。
    'LabeledStatement',
    // with 会改变词法作用域，禁止使用。
    'WithStatement',
    // 禁止 const enum，避免编译边界和运行时行为不透明。
    'TSEnumDeclaration[const=true]',
    // 禁止 TypeScript export assignment，统一使用 ESM export。
    'TSExportAssignment',
  ],
  // 强制注释与文本之间留空格，提升注释可读性。
  'spaced-comment': 'error',
  // 函数括号空格由 antfu 的 stylistic 规则统一处理，这里不重复指定。
  'space-before-function-paren': 'off',
} satisfies TypedFlatConfigItem['rules']

/** 传给 `@antfu/eslint-config` 的通用规则片段。 */
export const ruleOverrides = {
  rules: rules,
} satisfies TypedFlatConfigItem

/**
 * JavaScript 基础配置工厂。
 *
 * 规则对象保留为可合并的静态值，工厂负责把 linter 选项和组织默认规则
 * 组合成 Flat Config。这样消费方仍可通过 `rules` 覆盖单条规则，而不用
 * 复制整份 JavaScript 配置。
 */
export async function javascript(
  additionalRules: TypedFlatConfigItem['rules'] = {},
  linterOptions: NonNullable<Linter.Config['linterOptions']> = {},
): Promise<Linter.Config[]> {
  return [
    {
      // 合并消费方选项；消费方只覆盖需要改变的 linter 行为即可。
      linterOptions: {
        ...defaultLinterOptions,
        ...linterOptions,
      },
      rules: {
        // 先应用组织默认规则，再让消费方覆盖具体规则。
        ...rules,
        ...additionalRules,
      },
    },
  ]
}
