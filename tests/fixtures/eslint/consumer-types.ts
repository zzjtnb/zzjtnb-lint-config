import type {
  ESLintConfigOptions,
  ESLintPnpmOptions,
  ESLintStylisticOptions,
  ESLintUserConfig,
} from '@zzjtnb/eslint-config'
import type { Linter } from 'eslint'

import { zzjtnb } from '@zzjtnb/eslint-config'

const stylistic: ESLintStylisticOptions = { semi: true }
const pnpm: ESLintPnpmOptions = { yaml: false, catalogs: false }
const options: ESLintConfigOptions = {
  stylistic,
  pnpm,
  defaultIgnores: ['**/generated/**'],
  vue: {
    overrides: { 'vue/require-default-prop': 'off' },
  },
}
const fileConfig: ESLintUserConfig = {
  files: ['**/*.ts'],
  rules: { 'no-console': 'warn' },
}

// 返回值、四个公开类型和上游对象选项均从发布声明获得，不借助仓库源码 paths。
export const config: Promise<Linter.Config[]> = zzjtnb(options, fileConfig)
