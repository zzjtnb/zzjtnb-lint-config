import { zzjtnb } from '@zzjtnb/eslint-config'

export default zzjtnb({
  markdown: false,
  rules: {
    // 仓库内直接修复类型问题，不使用类型忽略指令；负向类型测试应断言编译器诊断。
    'ts/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': true,
        'ts-ignore': true,
        'ts-nocheck': true,
        'ts-check': false,
      },
    ],
  },
  ignores: [
    'packages/*/README*.md',
  ],
})
