import type { Config } from '@zzjtnb/stylelint-config'

import defaults, { zzjtnb } from '@zzjtnb/stylelint-config'

// 包名解析必须读取发布声明，而非本仓库的源码 paths。
export const inherited: Config = defaults
export const configured: Config = zzjtnb({
  rules: { 'color-no-invalid-hex': true },
  overrides: [
    {
      files: ['**/*.scss'],
      rules: { 'scss/at-rule-no-unknown': true },
    },
  ],
})
