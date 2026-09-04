import type { TypedFlatConfigItem } from '@antfu/eslint-config'

/** 在 antfu Vue 推荐配置之上追加的公开约定。 */
const defaults = {
  // 模板属性使用 kebab-case，与 HTML 属性命名保持一致。
  'vue/attribute-hyphenation': [
    'error',
    'always',
    { ignore: [] },
  ],
  // 属性顺序交给 antfu 的排序策略，避免两套规则重复改写。
  'vue/attributes-order': 'off',
  // 单文件组件按 script、template、style 排列。
  'vue/block-order': [
    'error',
    {
      order: ['script', 'template', 'style'],
    },
  ],
  // 模板中的组件名使用 PascalCase。
  'vue/component-name-in-template-casing': ['error', 'PascalCase'],
  // 组件选项中的组件名使用 PascalCase。
  'vue/component-options-name-casing': ['error', 'PascalCase'],
  // 脚本中声明的自定义事件使用 camelCase。
  'vue/custom-event-name-casing': ['error', 'camelCase'],
  // 固定 script setup 编译宏的阅读顺序。
  'vue/define-macros-order': [
    'error',
    {
      order: [
        'defineOptions',
        'defineProps',
        'defineEmits',
        'defineSlots',
      ],
    },
  ],
  // 链式访问的点号放在属性侧。
  'vue/dot-location': ['error', 'property'],
  // 普通属性优先使用点号访问，同时允许关键字属性。
  'vue/dot-notation': [
    'error',
    { allowKeywords: true },
  ],
  // 使用 smart 模式，仅保留安全的宽松相等比较。
  'vue/eqeqeq': ['error', 'smart'],
  // 统一多行模板标签的闭合括号换行方式。
  'vue/html-closing-bracket-newline': 'error',
  // 缩进交给 antfu stylistic，避免 Vue 与 JavaScript 规则冲突。
  'vue/html-indent': 'off',
  // HTML 属性值使用双引号。
  'vue/html-quotes': ['error', 'double'],
  // 组件和空元素自闭合，普通 HTML 元素保留显式闭合标签。
  'vue/html-self-closing': [
    'error',
    {
      html: {
        component: 'always',
        normal: 'never',
        void: 'always',
      },
      math: 'always',
      svg: 'always',
    },
  ],
  // 属性换行由格式化工具决定，不设置单行数量上限。
  'vue/max-attributes-per-line': 'off',
  // 允许单词组件名，不在共享配置中限制消费方命名策略。
  'vue/multi-word-component-names': 'off',
  // 保留消费方对组件名与 Vue 保留名的控制权。
  'vue/no-reserved-component-names': 'off',
  // Props 类型可由 TypeScript 声明提供，不重复要求运行时类型。
  'vue/require-prop-types': 'off',
  // 简短的单行 HTML 内容不强制拆行。
  'vue/singleline-html-element-content-newline': 'off',
  // 多行 HTML 内容保持明确的内容换行。
  'vue/multiline-html-element-content-newline': 'error',
  // 禁止空的解构模式。
  'vue/no-empty-pattern': 'error',
  // 禁止无意义的额外括号，保留函数表达式所需括号。
  'vue/no-extra-parens': ['error', 'functions'],
  // 禁止模板和脚本中不可见的异常空白字符。
  'vue/no-irregular-whitespace': 'error',
  // 禁止可能造成数值精度误判的字面量。
  'vue/no-loss-of-precision': 'error',
  // 禁止调试、标签和 with 语句，避免掩盖控制流或作用域。
  'vue/no-restricted-syntax': [
    'error',
    'DebuggerStatement',
    'LabeledStatement',
    'WithStatement',
  ],
  // 禁止把指令名字符串作为动态 v-bind 属性。
  'vue/no-restricted-v-bind': ['error', '/^v-/'],
  // 禁止稀疏数组，避免产生隐含空槽位。
  'vue/no-sparse-arrays': 'error',
  // 禁止未使用的模板 ref。
  'vue/no-unused-refs': 'error',
  // 禁止没有实际作用的 v-bind。
  'vue/no-useless-v-bind': 'error',
  // 对象属性默认使用简写，保留引号属性和构造器语义。
  'vue/object-shorthand': [
    'error',
    'always',
    { avoidQuotes: true, ignoreConstructors: false },
  ],
  // 每个 Vue 文件只定义一个根组件实现。
  'vue/one-component-per-file': 'error',
  // 将可静态分析的 class 与动态绑定分开。
  'vue/prefer-separate-static-class': 'error',
  // 简单字符串拼接优先使用模板字符串。
  'vue/prefer-template': 'error',
  // Prop 名使用 camelCase。
  'vue/prop-name-casing': ['error', 'camelCase'],
  // 非必填 Prop 需要显式默认值，避免未定义状态扩散。
  'vue/require-default-prop': 'error',
  // 组件事件必须显式声明，使事件契约可追踪。
  'vue/require-explicit-emits': 'error',
  // 二元运算符两侧保留空格。
  'vue/space-infix-ops': 'error',
  // 单词一元运算符保留空格，符号运算符不留空格。
  'vue/space-unary-ops': [
    'error',
    { nonwords: false, words: true },
  ],
  // 模板中的 v-on 事件名使用 kebab-case，并允许自动修复。
  'vue/v-on-event-hyphenation': [
    'error',
    'always',
    { autofix: true, ignore: [] },
  ],
} satisfies NonNullable<TypedFlatConfigItem['rules']>

/**
 * 创建由 antfu Vue 集成消费的默认规则差异。
 * @returns 本次调用独立持有的规则；文件范围、parser、插件和消费方覆盖由上游组装。
 */
export function vueRules(): NonNullable<TypedFlatConfigItem['rules']> {
  return structuredClone(defaults)
}
