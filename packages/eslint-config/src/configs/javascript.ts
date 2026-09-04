import type { TypedFlatConfigItem } from '@antfu/eslint-config'
import type { Linter } from 'eslint'

/**
 * ESLint Flat Config 支持的 linter 级选项。
 *
 * 这里只报告未使用的禁用注释，不把 `--fix`、缓存等 CLI 执行参数混进
 * 共享配置，避免配置包改变消费方的执行策略。
 */
const defaultLinterOptions = {
  // 禁止未使用的 eslint-disable 注释长期留在代码中，但只报告 warning。
  reportUnusedDisableDirectives: 'warn',
  // 禁止未使用的 eslint 命令式配置注释长期留在代码中，但只报告 warning。
  reportUnusedInlineConfigs: 'warn',
} as const

/**
 * 不依赖额外插件的通用规则调整。
 *
 * antfu 已经提供 JavaScript、TypeScript、perfectionist 等基础规则，这里
 * 只覆盖本包与上游默认值不同的部分，避免复制整套上游实现；上游已经关闭的
 * 规则不再重复声明。
 */
const defaultRules = {
  // 不禁止使用顶层 await。
  'antfu/no-top-level-await': 'off',
  // 不限制 console 的使用。
  'no-console': 'off',
  // 不检查未定义的变量。
  'no-undef': 'off',
  // 生命周期回调和适配器可能需要保留空函数，因此不把它们判为错误。
  'no-empty-function': 'off',
  // 禁止容易掩盖控制流或引入不透明运行时语义的语法。
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

/**
 * 创建 JavaScript 基础规则与 linter 报告选项。
 *
 * 规则通过 antfu 的 JavaScript 覆盖入口应用，声明文件与后续语言集成的豁免仍由上游处理。
 *
 * @param linterOptions 消费方对 ESLint 报告行为的覆盖。
 * @returns 包含共享基础规则与报告选项的 Flat Config 片段。
 */
export function javascript(
  linterOptions: NonNullable<Linter.Config['linterOptions']> = {},
) {
  return {
    linterOptions: {
      ...defaultLinterOptions,
      ...linterOptions,
    },
    rules: {
      // 默认规则含数组选项，每次调用隔离，避免消费方修改结果后污染其他配置。
      ...structuredClone(defaultRules),
    },
  } satisfies TypedFlatConfigItem
}
