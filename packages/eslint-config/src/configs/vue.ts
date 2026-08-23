import type { Linter } from 'eslint'

import { interopDefault } from '../util.js'

/**
 * Vue 配置工厂。
 *
 * antfu 负责 Vue parser、processor、插件注册和推荐规则；本包只追加
 * 模板命名、块顺序、事件命名及 HTML 可读性约束，避免复制上游规则集。
 */
export async function vue(
  options: { typescript?: boolean } = {},
): Promise<Linter.Config[]> {
  // 只有同时启用 TypeScript 时，Vue parser 才把 <script lang="ts"> 交给
  // @typescript-eslint/parser；关闭 TypeScript 时保留 Vue 自己的 parser。
  // 使用上游公开工厂，确保 Vue parser 与 eslint-plugin-vue 版本保持一致。
  const upstreamVue = await interopDefault(
    import('@antfu/eslint-config'),
    'vue',
  )

  return [
    ...(await upstreamVue({ typescript: options.typescript })),
    {
      // 下面是组织级模板约定：属性、组件、事件、宏和 SFC 块顺序统一。
      files: ['**/*.vue'],
      rules: {
        // 强制模板属性使用 kebab-case，保证 HTML 属性命名一致。
        'vue/attribute-hyphenation': ['error', 'always', { ignore: [] }],
        // 不使用旧的属性排序规则，避免与 antfu 的其它排序策略冲突。
        'vue/attributes-order': 'off',
        // 统一单文件组件的块顺序：script、template、style。
        'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
        // 模板中的组件名统一使用 PascalCase。
        'vue/component-name-in-template-casing': ['error', 'PascalCase'],
        // 组件选项中的组件名统一使用 PascalCase。
        'vue/component-options-name-casing': ['error', 'PascalCase'],
        // 自定义事件统一使用 camelCase，避免同一事件出现多种写法。
        'vue/custom-event-name-casing': ['error', 'camelCase'],
        // 按项目约定排列 Vue 编译宏，保证 script setup 的阅读顺序稳定。
        'vue/define-macros-order': ['error', {
          order: ['defineOptions', 'defineProps', 'defineEmits', 'defineSlots'],
        }],
        // 链式访问的点号放在属性侧，保持链式表达式可读。
        'vue/dot-location': ['error', 'property'],
        // 允许访问关键字属性，但仍要求使用点号访问普通属性。
        'vue/dot-notation': ['error', { allowKeywords: true }],
        // 模板表达式允许安全的宽松相等比较，兼容 Vue 模板常见写法。
        'vue/eqeqeq': ['error', 'smart'],
        // 强制多行模板标签的闭合括号换行规则稳定。
        'vue/html-closing-bracket-newline': 'error',
        // 缩进交给 antfu 的 stylistic 规则，避免 Vue 与 JS 两套缩进规则冲突。
        'vue/html-indent': 'off',
        // HTML 属性值统一使用双引号。
        'vue/html-quotes': ['error', 'double'],
        // 组件、普通元素、空元素和 SVG 使用明确的自闭合策略。
        'vue/html-self-closing': ['error', {
          html: {
            component: 'always',
            normal: 'never',
            void: 'always',
          },
          math: 'always',
          svg: 'always',
        }],
        // 不限制单行属性数量，由格式化规则决定换行。
        'vue/max-attributes-per-line': 'off',
        // 允许业务组件使用单词组件名，避免强制修改现有组件命名。
        'vue/multi-word-component-names': 'off',
        // 允许业务组件名与 Vue 保留名存在项目内明确约定的重合。
        'vue/no-reserved-component-names': 'off',
        // Props 类型可以通过 TypeScript 类型声明提供，不重复要求运行时类型。
        'vue/require-prop-types': 'off',
        // 简单单行 HTML 内容不强制额外换行。
        'vue/singleline-html-element-content-newline': 'off',
        // 多行 HTML 内容必须保持清晰的内容换行。
        'vue/multiline-html-element-content-newline': 'error',
        // 禁止模板中存在空的结构模式。
        'vue/no-empty-pattern': 'error',
        // 禁止无意义的额外括号，但保留函数表达式需要的括号。
        'vue/no-extra-parens': ['error', 'functions'],
        // 禁止模板和脚本中不可见的异常空白字符。
        'vue/no-irregular-whitespace': 'error',
        // 禁止可能造成运行时精度误判的数字写法。
        'vue/no-loss-of-precision': 'error',
        // 禁止模板中容易掩盖控制流问题的调试、标签和 with 语句。
        'vue/no-restricted-syntax': ['error', 'DebuggerStatement', 'LabeledStatement', 'WithStatement'],
        // 禁止通过动态 v-bind 绕过明确的属性绑定约定。
        'vue/no-restricted-v-bind': ['error', '/^v-/'],
        // 禁止稀疏数组，避免模板数据出现隐含空槽位。
        'vue/no-sparse-arrays': 'error',
        // 禁止模板引用未使用，减少 ref 和 DOM 引用残留。
        'vue/no-unused-refs': 'error',
        // 删除没有实际作用的 v-bind，减少模板噪声。
        'vue/no-useless-v-bind': 'error',
        // 对象属性默认使用简写，保留引号属性和构造器语义。
        'vue/object-shorthand': ['error', 'always', { avoidQuotes: true, ignoreConstructors: false }],
        // 一个 Vue 文件只允许一个根组件实现。
        'vue/one-component-per-file': 'error',
        // 静态 class 优先拆分为可分析的静态部分，便于维护。
        'vue/prefer-separate-static-class': 'error',
        // 简单字符串拼接优先使用模板字符串。
        'vue/prefer-template': 'error',
        // Prop 名称统一使用 camelCase。
        'vue/prop-name-casing': ['error', 'camelCase'],
        // 业务组件默认要求声明默认 Prop 值，避免未定义状态扩散。
        'vue/require-default-prop': 'error',
        // 组件事件必须显式声明，保证事件契约可追踪。
        'vue/require-explicit-emits': 'error',
        // 二元运算符两侧必须保留空格。
        'vue/space-infix-ops': 'error',
        // 一元运算符按单词和非单词分别使用统一空格策略。
        'vue/space-unary-ops': ['error', { nonwords: false, words: true }],
        // v-on 事件名统一使用 kebab-case，并允许自动修复。
        'vue/v-on-event-hyphenation': ['error', 'always', { autofix: true, ignore: [] }],
      },
    },
  ]
}
